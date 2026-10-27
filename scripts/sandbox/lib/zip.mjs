import {
    closeSync,
    lstatSync,
    openSync,
    readdirSync,
    readFileSync,
    readSync,
    writeSync,
} from 'node:fs';
import { join } from 'node:path';
import { crc32, deflateRawSync } from 'node:zlib';

// Written in Node because system tools differ per OS, and Windows tar.exe writes zip entry names
// in the local code page, so XP sees "ø" as "?".

const UTF8_NAMES_FLAG = 0x0800;
const STORED = 0;
const DEFLATED = 8;
const MAX_32 = 0xffffffff;
const MAX_16 = 0xffff;
const VERSION_DEFAULT = 20;
const VERSION_ZIP64 = 45;
const DIRECTORY_ATTRIBUTE = 0x10;
const ZIP64_EXTRA_ID = 0x0001;
// Larger files are stored uncompressed and copied in chunks, so memory use stays bounded. Most of
// them are media that deflate would barely shrink.
const LARGE_FILE_BYTES = 64 * 1024 * 1024;
const CHUNK_BYTES = 1024 * 1024;

const toDosDateTime = (date) => ({
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
    date:
        (Math.max(date.getFullYear() - 1980, 0) << 9) |
        ((date.getMonth() + 1) << 5) |
        date.getDate(),
});

const listEntries = (sourceRoot, name) => {
    const entries = [];
    const visit = (relativePath) => {
        const path = join(sourceRoot, ...relativePath.split('/'));
        const stat = lstatSync(path);
        if (stat.isDirectory()) {
            entries.push({ path, name: `${relativePath}/`, mtime: stat.mtime, directory: true });
            readdirSync(path)
                .sort()
                .forEach((child) => visit(`${relativePath}/${child}`));
        } else if (stat.isFile()) {
            entries.push({
                path,
                name: relativePath,
                mtime: stat.mtime,
                size: stat.size,
                directory: false,
            });
        } else {
            throw new Error(`Zip archives may contain only regular files and directories: ${path}`);
        }
    };
    visit(name);
    return entries;
};

const readSmallEntry = (entry) => {
    if (entry.directory) {
        return { method: STORED, crc: 0, size: 0, data: Buffer.alloc(0) };
    }
    const content = readFileSync(entry.path);
    const deflated = deflateRawSync(content);
    const useDeflated = deflated.length < content.length;
    return {
        method: useDeflated ? DEFLATED : STORED,
        crc: crc32(content),
        size: content.length,
        data: useDeflated ? deflated : content,
    };
};

// Calls onChunk with each chunk of the file, failing if the file no longer has the listed size.
const readInChunks = ({ path, size }, onChunk) => {
    const fd = openSync(path, 'r');
    const buffer = Buffer.alloc(CHUNK_BYTES);
    try {
        let total = 0;
        while (total < size) {
            const bytesRead = readSync(fd, buffer, 0, Math.min(CHUNK_BYTES, size - total), null);
            if (bytesRead === 0) {
                throw new Error(`File changed while it was being archived: ${path}`);
            }
            onChunk(buffer.subarray(0, bytesRead));
            total += bytesRead;
        }
    } finally {
        closeSync(fd);
    }
};

const writeLocalHeader = (write, { nameBytes, method, crc, size, compressedSize, dos }) => {
    const needsZip64 = size >= MAX_32 || compressedSize >= MAX_32;
    const extra = Buffer.alloc(needsZip64 ? 20 : 0);
    if (needsZip64) {
        extra.writeUInt16LE(ZIP64_EXTRA_ID, 0);
        extra.writeUInt16LE(16, 2);
        extra.writeBigUInt64LE(BigInt(size), 4);
        extra.writeBigUInt64LE(BigInt(compressedSize), 12);
    }
    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50, 0);
    header.writeUInt16LE(needsZip64 ? VERSION_ZIP64 : VERSION_DEFAULT, 4);
    header.writeUInt16LE(UTF8_NAMES_FLAG, 6);
    header.writeUInt16LE(method, 8);
    header.writeUInt16LE(dos.time, 10);
    header.writeUInt16LE(dos.date, 12);
    header.writeUInt32LE(crc, 14);
    header.writeUInt32LE(needsZip64 ? MAX_32 : compressedSize, 18);
    header.writeUInt32LE(needsZip64 ? MAX_32 : size, 22);
    header.writeUInt16LE(nameBytes.length, 26);
    header.writeUInt16LE(extra.length, 28);
    write(header);
    write(nameBytes);
    write(extra);
};

const buildCentralHeader = ({
    nameBytes,
    method,
    crc,
    size,
    compressedSize,
    dos,
    offset,
    directory,
}) => {
    // The zip64 extra field holds, in this order, only the values too large for their header field.
    const zip64Values = [size, compressedSize, offset].filter((value) => value >= MAX_32);
    const needsZip64 = zip64Values.length > 0;
    const extra = Buffer.alloc(needsZip64 ? 4 + zip64Values.length * 8 : 0);
    if (needsZip64) {
        extra.writeUInt16LE(ZIP64_EXTRA_ID, 0);
        extra.writeUInt16LE(zip64Values.length * 8, 2);
        zip64Values.forEach((value, index) => extra.writeBigUInt64LE(BigInt(value), 4 + index * 8));
    }
    const header = Buffer.alloc(46);
    header.writeUInt32LE(0x02014b50, 0);
    header.writeUInt16LE(needsZip64 ? VERSION_ZIP64 : VERSION_DEFAULT, 4);
    header.writeUInt16LE(needsZip64 ? VERSION_ZIP64 : VERSION_DEFAULT, 6);
    header.writeUInt16LE(UTF8_NAMES_FLAG, 8);
    header.writeUInt16LE(method, 10);
    header.writeUInt16LE(dos.time, 12);
    header.writeUInt16LE(dos.date, 14);
    header.writeUInt32LE(crc, 16);
    header.writeUInt32LE(Math.min(compressedSize, MAX_32), 20);
    header.writeUInt32LE(Math.min(size, MAX_32), 24);
    header.writeUInt16LE(nameBytes.length, 28);
    header.writeUInt16LE(extra.length, 30);
    header.writeUInt16LE(0, 32);
    header.writeUInt16LE(0, 34);
    header.writeUInt16LE(0, 36);
    header.writeUInt32LE(directory ? DIRECTORY_ATTRIBUTE : 0, 38);
    header.writeUInt32LE(Math.min(offset, MAX_32), 42);
    return Buffer.concat([header, nameBytes, extra]);
};

const writeEndOfCentralDirectory = (write, { count, directorySize, directoryOffset }) => {
    const needsZip64 = count >= MAX_16 || directorySize >= MAX_32 || directoryOffset >= MAX_32;
    if (needsZip64) {
        const zip64EndOffset = directoryOffset + directorySize;
        const record = Buffer.alloc(56);
        record.writeUInt32LE(0x06064b50, 0);
        record.writeBigUInt64LE(44n, 4);
        record.writeUInt16LE(VERSION_ZIP64, 12);
        record.writeUInt16LE(VERSION_ZIP64, 14);
        record.writeUInt32LE(0, 16);
        record.writeUInt32LE(0, 20);
        record.writeBigUInt64LE(BigInt(count), 24);
        record.writeBigUInt64LE(BigInt(count), 32);
        record.writeBigUInt64LE(BigInt(directorySize), 40);
        record.writeBigUInt64LE(BigInt(directoryOffset), 48);
        write(record);
        const locator = Buffer.alloc(20);
        locator.writeUInt32LE(0x07064b50, 0);
        locator.writeUInt32LE(0, 4);
        locator.writeBigUInt64LE(BigInt(zip64EndOffset), 8);
        locator.writeUInt32LE(1, 16);
        write(locator);
    }
    const end = Buffer.alloc(22);
    end.writeUInt32LE(0x06054b50, 0);
    end.writeUInt16LE(0, 4);
    end.writeUInt16LE(0, 6);
    end.writeUInt16LE(Math.min(count, MAX_16), 8);
    end.writeUInt16LE(Math.min(count, MAX_16), 10);
    end.writeUInt32LE(Math.min(directorySize, MAX_32), 12);
    end.writeUInt32LE(Math.min(directoryOffset, MAX_32), 16);
    end.writeUInt16LE(0, 20);
    write(end);
};

// Zips sourceRoot/name recursively with UTF-8 entry names, keeping name/ as the top-level folder.
export const writeZipArchive = ({ sourceRoot, name, archivePath }) => {
    const entries = listEntries(sourceRoot, name);
    const fd = openSync(archivePath, 'w', 0o600);
    let position = 0;
    // writeSync may write only part of the buffer, so keep writing until all of it is written.
    const write = (buffer) => {
        let written = 0;
        while (written < buffer.length) {
            const bytesWritten = writeSync(fd, buffer, written, buffer.length - written);
            if (bytesWritten === 0) {
                throw new Error(`Could not write to ${archivePath}`);
            }
            written += bytesWritten;
        }
        position += buffer.length;
    };
    try {
        const centralHeaders = entries.map((entry) => {
            const common = {
                nameBytes: Buffer.from(entry.name, 'utf8'),
                dos: toDosDateTime(entry.mtime),
                offset: position,
                directory: entry.directory,
            };
            if (entry.directory || entry.size < LARGE_FILE_BYTES) {
                const { method, crc, size, data } = readSmallEntry(entry);
                const fields = { ...common, method, crc, size, compressedSize: data.length };
                writeLocalHeader(write, fields);
                write(data);
                return buildCentralHeader(fields);
            }
            let crc = 0;
            readInChunks(entry, (chunk) => {
                crc = crc32(chunk, crc);
            });
            const fields = {
                ...common,
                method: STORED,
                crc,
                size: entry.size,
                compressedSize: entry.size,
            };
            writeLocalHeader(write, fields);
            readInChunks(entry, write);
            return buildCentralHeader(fields);
        });
        const directoryOffset = position;
        centralHeaders.forEach(write);
        writeEndOfCentralDirectory(write, {
            count: centralHeaders.length,
            directorySize: position - directoryOffset,
            directoryOffset,
        });
    } finally {
        closeSync(fd);
    }
};

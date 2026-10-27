import { closeSync, lstatSync, openSync, readdirSync, readFileSync, writeSync } from 'node:fs';
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
            entries.push({ path, name: relativePath, mtime: stat.mtime, directory: false });
        } else {
            throw new Error(`Zip archives may contain only regular files and directories: ${path}`);
        }
    };
    visit(name);
    return entries;
};

const readEntryData = (entry) => {
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

const writeLocalHeader = (write, { nameBytes, method, crc, size, compressedSize, dos }) => {
    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50, 0);
    header.writeUInt16LE(VERSION_DEFAULT, 4);
    header.writeUInt16LE(UTF8_NAMES_FLAG, 6);
    header.writeUInt16LE(method, 8);
    header.writeUInt16LE(dos.time, 10);
    header.writeUInt16LE(dos.date, 12);
    header.writeUInt32LE(crc, 14);
    header.writeUInt32LE(compressedSize, 18);
    header.writeUInt32LE(size, 22);
    header.writeUInt16LE(nameBytes.length, 26);
    header.writeUInt16LE(0, 28);
    write(header);
    write(nameBytes);
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
    const needsZip64 = offset >= MAX_32;
    const extra = Buffer.alloc(needsZip64 ? 12 : 0);
    if (needsZip64) {
        extra.writeUInt16LE(0x0001, 0);
        extra.writeUInt16LE(8, 2);
        extra.writeBigUInt64LE(BigInt(offset), 4);
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
    header.writeUInt32LE(compressedSize, 20);
    header.writeUInt32LE(size, 24);
    header.writeUInt16LE(nameBytes.length, 28);
    header.writeUInt16LE(extra.length, 30);
    header.writeUInt16LE(0, 32);
    header.writeUInt16LE(0, 34);
    header.writeUInt16LE(0, 36);
    header.writeUInt32LE(directory ? DIRECTORY_ATTRIBUTE : 0, 38);
    header.writeUInt32LE(needsZip64 ? MAX_32 : offset, 42);
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
    const write = (buffer) => {
        writeSync(fd, buffer);
        position += buffer.length;
    };
    try {
        const centralHeaders = entries.map((entry) => {
            const { method, crc, size, data } = readEntryData(entry);
            if (data.length >= MAX_32) {
                throw new Error(`File is too large for the zip writer: ${entry.path}`);
            }
            const fields = {
                nameBytes: Buffer.from(entry.name, 'utf8'),
                method,
                crc,
                size,
                compressedSize: data.length,
                dos: toDosDateTime(entry.mtime),
                offset: position,
                directory: entry.directory,
            };
            writeLocalHeader(write, fields);
            write(data);
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

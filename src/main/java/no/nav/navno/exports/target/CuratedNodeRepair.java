package no.nav.navno.exports.target;

import java.io.IOException;
import java.io.InputStream;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Supplier;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.common.io.ByteSource;

import com.enonic.xp.context.ContextAccessor;
import com.enonic.xp.data.Property;
import com.enonic.xp.data.PropertyPath;
import com.enonic.xp.data.PropertySet;
import com.enonic.xp.data.PropertyTree;
import com.enonic.xp.data.ValueTypes;
import com.enonic.xp.index.ChildOrder;
import com.enonic.xp.index.IndexConfig;
import com.enonic.xp.index.IndexConfigDocument;
import com.enonic.xp.index.IndexValueProcessors;
import com.enonic.xp.index.PathIndexConfig;
import com.enonic.xp.index.PatternIndexConfigDocument;
import com.enonic.xp.node.AttachedBinary;
import com.enonic.xp.node.FindNodesByParentParams;
import com.enonic.xp.node.FindNodesByParentResult;
import com.enonic.xp.node.Node;
import com.enonic.xp.node.NodeId;
import com.enonic.xp.node.NodeNotFoundException;
import com.enonic.xp.node.NodePath;
import com.enonic.xp.node.NodeService;
import com.enonic.xp.node.NodeType;
import com.enonic.xp.node.RefreshMode;
import com.enonic.xp.node.UpdateNodeParams;
import com.enonic.xp.script.bean.BeanContext;
import com.enonic.xp.script.bean.ScriptBean;
import com.enonic.xp.script.serializer.MapSerializable;
import com.enonic.xp.util.BinaryReference;
import com.enonic.xp.util.GeoPoint;
import com.enonic.xp.util.Link;
import com.enonic.xp.util.Reference;

/** Target-only: exclude this package and its TS wrapper from production artifacts. */
public final class CuratedNodeRepair implements ScriptBean {
    private static final Set<String> REPOSITORIES = Set.of(
        "com.enonic.cms.default", "com.enonic.cms.navno-engelsk", "com.enonic.cms.navno-nynorsk");
    private static final String ROOT = "/content/www.nav.no";
    private static final String CONTENT_ID_FIELD = "contentId";
    private static final String MANUAL_CHILD_ORDER_FIELD = "manualChildOrder";
    private static final Pattern BINARY_HASH_PATTERN = Pattern.compile("[a-f0-9]{128}");
    private static final Pattern BINARY_SIZE_PATTERN = Pattern.compile("0|[1-9]\\d*");
    private Supplier<NodeService> service;

    @Override
    public void initialize(final BeanContext context) {
        service = context.getService(NodeService.class);
    }

    public MapSerializable repair(final String json) throws Exception {
        return execute(json, true);
    }

    public MapSerializable validate(final String json) throws Exception {
        return execute(json, false);
    }

    private MapSerializable execute(final String json, final boolean repair) throws Exception {
        final JsonNode batch = new ObjectMapper().readTree(json);
        final String repository = text(batch, "repository");
        final String branch = text(batch, "branch");
        if (!REPOSITORIES.contains(repository) || !Set.of("draft", "master").contains(branch) ||
            !repository.equals(ContextAccessor.current().getRepositoryId().toString()) ||
            !branch.equals(ContextAccessor.current().getBranch().toString())) {
            throw new IllegalArgumentException("Target context does not match an allowed CMS branch");
        }
        final boolean page = "page".equals(text(batch, "scope"));
        if (!page && !"full".equals(text(batch, "scope"))) {
            throw new IllegalArgumentException("Expected page or full scope");
        }
        final JsonNode expectations = array(batch, "expectations");
        final JsonNode absent = array(batch, "absentContentIds");
        if (expectations.size() + absent.size() == 0 || expectations.size() + absent.size() > 100) {
            throw new IllegalArgumentException("Expected 1 to 100 explicit target entries per batch");
        }
        final Map<String, Patch> patches = new LinkedHashMap<>();
        final Set<String> paths = new HashSet<>();
        long binaryCount = 0;
        // Every expectation, binary, negative membership, and ordering conflict is checked before any write.
        for (final JsonNode expected : expectations) {
            if (expected.path("formatVersion").asInt() != 2) {
                throw new IllegalArgumentException("Typed expectation formatVersion 2 is required");
            }
            final Node node = requireNode(expected);
            if (patches.containsKey(node.id().toString()) || !paths.add(node.path().toString())) {
                throw new IllegalArgumentException("Duplicate target identity or path");
            }
            final Patch patch = new Patch(node);
            patch.data = verifyData(expected, node, repair);
            binaryCount += verifyBinaries(expected, node);
            patch.childOrder = ChildOrder.from(text(expected, "childOrder"));
            patch.indexConfig = indexConfig(expected.get("indexConfig"));
            if (!"content".equals(text(expected, "nodeType"))) {
                throw new IllegalArgumentException("Only CMS content node types may be restored");
            }
            patch.nodeType = NodeType.from("content");
            patches.put(node.id().toString(), patch);
        }
        verifyAbsent(absent, patches.keySet());
        for (final JsonNode expected : expectations) {
            planOrder(expected, patches, page, repair);
        }
        int repaired = 0;
        if (repair) {
            for (final Patch patch : patches.values()) {
                final Node current = getById(patch.node.id());
                if (current == null || !current.path().equals(patch.node.path()) ||
                    !current.getNodeVersionId().equals(patch.node.getNodeVersionId())) {
                    throw new IllegalStateException("Target changed during preflight: " + patch.node.id());
                }
            }
            for (final Patch patch : patches.values()) {
                if (patch.changed()) {
                    service.get().update(UpdateNodeParams.create().id(patch.node.id()).editor(edit -> {
                        if (!edit.source.path().equals(patch.node.path()) ||
                            !edit.source.getNodeVersionId().equals(patch.node.getNodeVersionId())) {
                            throw new IllegalStateException("Target changed during repair: " + patch.node.id());
                        }
                        edit.childOrder = patch.childOrder;
                        edit.indexConfigDocument = patch.indexConfig;
                        edit.nodeType = patch.nodeType;
                        edit.manualOrderValue = patch.manualOrderValue;
                        if (patch.data != null) {
                            edit.data = patch.data;
                        }
                    }).build());
                    repaired++;
                }
            }
            if (repaired > 0) {
                service.get().refresh(RefreshMode.ALL);
            }
        }
        for (final JsonNode expected : expectations) {
            final Node node = requireNode(expected);
            final Patch patch = patches.get(node.id().toString());
            if (!repair && !node.getNodeVersionId().equals(patch.node.getNodeVersionId())) {
                throw new IllegalStateException("Target changed during validation: " + node.id());
            }
            if (!node.getChildOrder().equals(patch.childOrder) ||
                !node.getIndexConfigDocument().equals(patch.indexConfig) ||
                !node.getNodeType().equals(patch.nodeType)) {
                throw new IllegalStateException("Target metadata mismatch: " + node.id());
            }
            verifyData(expected, node, false);
            if (repair) {
                verifyBinaries(expected, node);
            }
            verifyOrder(expected, node);
        }
        verifyAbsent(absent, patches.keySet());
        final int repairedCount = repaired;
        final long checkedBinaries = binaryCount;
        return gen -> {
            gen.value("checkedNodes", expectations.size());
            gen.value("checkedBinaries", checkedBinaries);
            gen.value("checkedAbsentEntries", absent.size());
            gen.value("repairedNodes", repairedCount);
        };
    }

    private Node requireNode(final JsonNode expected) {
        final String id = text(expected, CONTENT_ID_FIELD);
        final String path = text(expected, "contentPath");
        checkId(id);
        checkPath(path);
        final Node node = getById(NodeId.from(id));
        final Node atPath = getByPath(new NodePath(path));
        if (node == null || atPath == null || !node.id().equals(atPath.id()) ||
            !node.path().toString().equals(path)) {
            throw new IllegalStateException("Missing or colliding target identity: " + id + " at " + path);
        }
        return node;
    }

    private Node getById(final NodeId id) {
        try {
            return service.get().getById(id);
        } catch (final NodeNotFoundException e) {
            return null;
        }
    }

    private Node getByPath(final NodePath path) {
        try {
            return service.get().getByPath(path);
        } catch (final NodeNotFoundException e) {
            return null;
        }
    }

    private void verifyAbsent(final JsonNode absent, final Set<String> selected) {
        final Set<String> seen = new HashSet<>();
        for (final JsonNode value : absent) {
            if (!value.isTextual()) {
                throw new IllegalArgumentException("Absent content ids must be strings");
            }
            final String id = value.asText();
            checkId(id);
            if (!seen.add(id) || selected.contains(id)) {
                throw new IllegalArgumentException("Conflicting branch membership for " + id);
            }
            if (getById(NodeId.from(id)) != null) {
                throw new IllegalStateException("Unexpected target branch membership: " + id);
            }
        }
    }

    private PropertyTree verifyData(final JsonNode expected, final Node node, final boolean repairTemporalPrecision) {
        final PropertyTree tree = new PropertyTree();
        properties(array(expected, "properties"), tree.getRoot());
        final PropertyTree candidate = repairTemporalPrecision ? node.data().copy() : node.data();
        final String mismatch = mismatch(tree.getRoot(), candidate.getRoot(), "", repairTemporalPrecision);
        if (mismatch != null) {
            throw new IllegalStateException("Imported typed data mismatch at " + mismatch + " for " + node.id() +
                                            "; only same-typed millisecond truncation may be repaired");
        }
        return repairTemporalPrecision && !candidate.equals(node.data()) ? candidate : null;
    }

    private String mismatch(final PropertySet expected, final PropertySet actual, final String prefix,
                            final boolean repairTemporalPrecision) {
        for (final Property property : expected.getProperties()) {
            final String path = prefix + property.getName() + "[" + property.getIndex() + "]";
            final Property other = actual.getProperty(property.getName(), property.getIndex());
            if (other == null || !property.getType().equals(other.getType())) {
                return path + " (type or presence)";
            }
            if (property.getType().equals(ValueTypes.PROPERTY_SET) &&
                !property.getValue().isNull() && !other.getValue().isNull()) {
                final String nested = mismatch(property.getSet(), other.getSet(), path + ".", repairTemporalPrecision);
                if (nested != null) {
                    return nested;
                }
            } else if (!property.getValue().equals(other.getValue())) {
                if (repairTemporalPrecision && isMillisecondTruncation(property, other)) {
                    other.setValue(property.getValue());
                } else {
                    return path + " (value)";
                }
            }
        }
        for (final Property property : actual.getProperties()) {
            if (expected.getProperty(property.getName(), property.getIndex()) == null) {
                return prefix + "(extra properties)";
            }
        }
        return null;
    }

    private boolean isMillisecondTruncation(final Property expected, final Property actual) {
        // Native XML import can truncate precision; no other data correction is permitted.
        if (expected.getValue().isNull() || actual.getValue().isNull()) {
            return false;
        }
        if (expected.getType().equals(ValueTypes.DATE_TIME)) {
            return expected.getInstant().truncatedTo(ChronoUnit.MILLIS).equals(actual.getInstant());
        }
        if (expected.getType().equals(ValueTypes.LOCAL_DATE_TIME)) {
            return expected.getLocalDateTime().truncatedTo(ChronoUnit.MILLIS).equals(actual.getLocalDateTime());
        }
        if (expected.getType().equals(ValueTypes.LOCAL_TIME)) {
            return expected.getLocalTime().truncatedTo(ChronoUnit.MILLIS).equals(actual.getLocalTime());
        }
        return false;
    }

    private void properties(final JsonNode properties, final PropertySet set) {
        for (final JsonNode property : properties) {
            final String name = text(property, "name");
            final String type = text(property, "type");
            final JsonNode raw = property.get("value");
            if (raw == null) {
                throw new IllegalArgumentException("Typed property value is required");
            }
            if ("property-set".equals(type)) {
                if (raw.isNull()) {
                    set.addSet(name, null);
                } else {
                    if (!raw.isArray()) {
                        throw new IllegalArgumentException("Property-set value must be an array");
                    }
                    properties(raw, set.addSet(name));
                }
                continue;
            }
            if (!raw.isNull() && !raw.isTextual()) {
                throw new IllegalArgumentException("Typed scalar values must be exact strings");
            }
            final String value = raw.isNull() ? null : raw.asText();
            switch (type) {
                case "string": set.addString(name, value); break;
                case "xml": set.addXml(name, value); break;
                case "long": set.addLong(name, value == null ? null : Long.valueOf(value)); break;
                case "double": set.addDouble(name, value == null ? null : Double.valueOf(value)); break;
                case "boolean":
                    if (value != null && !"true".equals(value) && !"false".equals(value)) {
                        throw new IllegalArgumentException("Invalid boolean value");
                    }
                    set.addBoolean(name, value == null ? null : Boolean.valueOf(value)); break;
                case "dateTime": set.addInstant(name, value == null ? null : Instant.parse(value)); break;
                case "localDateTime": set.addLocalDateTime(name, value == null ? null : LocalDateTime.parse(withoutZone(value))); break;
                case "localDate": set.addLocalDate(name, value == null ? null : LocalDate.parse(withoutZone(value))); break;
                case "localTime": set.addLocalTime(name, value == null ? null : LocalTime.parse(withoutZone(value))); break;
                case "reference": set.addReference(name, value == null ? null : Reference.from(value)); break;
                case "link": set.addLink(name, value == null ? null : Link.from(value)); break;
                case "binaryReference": set.addBinaryReference(name, value == null ? null : BinaryReference.from(value)); break;
                case "geoPoint": set.addGeoPoint(name, value == null ? null : GeoPoint.from(value)); break;
                default: throw new IllegalArgumentException("Unsupported XP property type: " + type);
            }
        }
    }

    private long verifyBinaries(final JsonNode expected, final Node node)
            throws IOException, NoSuchAlgorithmException {
        final Map<String, String> actual = new LinkedHashMap<>();
        for (final AttachedBinary binary : node.getAttachedBinaries()) {
            actual.put(binary.getBinaryReference().toString(), binary.getBlobKey());
        }
        final Set<String> seen = new HashSet<>();
        for (final JsonNode binary : array(expected, "binaries")) {
            final String reference = text(binary, "reference");
            final String hash = text(binary, "sha512");
            final String size = text(binary, "size");
            if (!seen.add(reference) || !actual.containsKey(reference) ||
                !BINARY_HASH_PATTERN.matcher(hash).matches() || !BINARY_SIZE_PATTERN.matcher(size).matches()) {
                throw new IllegalArgumentException("Invalid or missing binary expectation for " + node.id());
            }
            final long expectedSize = Long.parseLong(size);
            final ByteSource bytes = service.get().getBinary(node.id(), node.getNodeVersionId(), BinaryReference.from(reference));
            if (bytes == null) {
                throw new IllegalStateException("Missing target binary for " + node.id());
            }
            final MessageDigest digest = MessageDigest.getInstance("SHA-512");
            long count = 0;
            try (InputStream stream = bytes.openStream()) {
                final byte[] buffer = new byte[65536];
                int read;
                while ((read = stream.read(buffer)) != -1) {
                    digest.update(buffer, 0, read);
                    count = Math.addExact(count, read);
                }
            }
            final StringBuilder hex = new StringBuilder();
            for (final byte value : digest.digest()) {
                hex.append(Character.forDigit((value >>> 4) & 15, 16));
                hex.append(Character.forDigit(value & 15, 16));
            }
            if (count != expectedSize || !hash.equals(hex.toString())) {
                throw new IllegalStateException("Target binary integrity mismatch: " + node.id() + "/" + reference);
            }
        }
        final Set<String> referenced = node.data().getProperties(ValueTypes.BINARY_REFERENCE).stream()
            .filter(property -> !property.getValue().isNull())
            .map(property -> property.getBinaryReference().toString()).collect(Collectors.toSet());
        if (!seen.equals(actual.keySet()) || !seen.containsAll(referenced)) {
            throw new IllegalStateException("Missing or unexpected target binary expectations for " + node.id());
        }
        return seen.size();
    }

    private void planOrder(final JsonNode expected, final Map<String, Patch> patches,
                           final boolean page, final boolean repair) {
        final Patch parent = patches.get(text(expected, CONTENT_ID_FIELD));
        final JsonNode order = expected.get(MANUAL_CHILD_ORDER_FIELD);
        if (!parent.childOrder.isManualOrder()) {
            if (order != null && !order.isNull()) {
                throw new IllegalArgumentException("Non-manual parents must not supply manual child order");
            }
            if (!page || parent.node.getChildOrder().equals(parent.childOrder)) {
                return;
            }
        } else if (order != null && order.isArray() && order.isEmpty() &&
                   parent.node.getChildOrder().equals(parent.childOrder)) {
            return;
        }
        final List<String> currentChildren = children(parent.node, parent.childOrder);
        final List<String> desired = new ArrayList<>();
        final Set<String> desiredIds = new HashSet<>();
        if (parent.childOrder.isManualOrder()) {
            if (order == null || !order.isArray()) {
                throw new IllegalArgumentException("Manual parents require an explicit selected child order");
            }
            for (final JsonNode child : order) {
                final Node node = requireNode(child);
                if (!node.parentPath().equals(parent.node.path()) || !desiredIds.add(node.id().toString())) {
                    throw new IllegalArgumentException("Manual child order contains a duplicate or a different parent");
                }
                desired.add(node.id().toString());
                patches.putIfAbsent(node.id().toString(), new Patch(node));
            }
        }
        final boolean extraChildren = currentChildren.stream().anyMatch(id -> !patches.containsKey(id));
        if (page && extraChildren && !parent.node.getChildOrder().equals(parent.childOrder)) {
            throw new IllegalStateException("Ambiguous page repair would reorder unselected children: " + parent.node.id());
        }
        final List<String> actual = currentChildren.stream().filter(desiredIds::contains).collect(Collectors.toList());
        // Metadata updates can change timestamp tie-breakers even when the current order matches.
        final Set<Long> ranks = desired.stream().map(id -> patches.get(id).manualOrderValue).collect(Collectors.toSet());
        final boolean unstableTies = ranks.size() != desired.size() &&
            (!page || desired.stream().anyMatch(id -> patches.get(id).changed()));
        if (page && repair && desired.stream().anyMatch(id -> patches.get(id).changed())) {
            final Set<Long> unselectedRanks = new HashSet<>();
            for (final String siblingId : currentChildren) {
                if (!desiredIds.contains(siblingId)) {
                    final Node sibling = getById(NodeId.from(siblingId));
                    if (sibling == null) {
                        throw new IllegalStateException("Target sibling changed during preflight: " + siblingId);
                    }
                    unselectedRanks.add(sibling.getManualOrderValue());
                }
            }
            for (final String id : desired) {
                final Patch child = patches.get(id);
                if (child.changed() && unselectedRanks.contains(child.manualOrderValue)) {
                    throw new IllegalStateException("Ambiguous page repair has tied unselected siblings: " + id);
                }
            }
        }
        if (!actual.equals(desired) || (repair && unstableTies)) {
            if (!repair) {
                throw new IllegalStateException("Manual child order mismatch: " + parent.node.id());
            }
            if (page && currentChildren.stream().anyMatch(id -> !desiredIds.contains(id))) {
                throw new IllegalStateException("Ambiguous page repair would reorder unselected siblings: " + parent.node.id());
            }
            final String sort = parent.childOrder.toString().toLowerCase();
            final boolean ascending = sort.startsWith("_manualordervalue asc");
            if (!ascending && !sort.startsWith("_manualordervalue desc")) {
                throw new IllegalStateException("Cannot repair a non-primary manual ordering expression");
            }
            for (int index = 0; index < desired.size(); index++) {
                patches.get(desired.get(index)).manualOrderValue =
                    ascending ? Long.MIN_VALUE + (long) index * 1024 : Long.MAX_VALUE - (long) index * 1024;
            }
        }
    }

    private void verifyOrder(final JsonNode expected, final Node parent) {
        if (!parent.getChildOrder().isManualOrder()) {
            return;
        }
        if (array(expected, MANUAL_CHILD_ORDER_FIELD).isEmpty()) {
            return;
        }
        final List<String> desired = new ArrayList<>();
        for (final JsonNode child : array(expected, MANUAL_CHILD_ORDER_FIELD)) {
            requireNode(child);
            desired.add(text(child, CONTENT_ID_FIELD));
        }
        final Set<String> desiredIds = new HashSet<>(desired);
        final List<String> actual = children(parent, parent.getChildOrder()).stream()
            .filter(desiredIds::contains).collect(Collectors.toList());
        if (!desired.equals(actual)) {
            throw new IllegalStateException("Manual child order mismatch after repair: " + parent.id());
        }
    }

    private List<String> children(final Node parent, final ChildOrder order) {
        final FindNodesByParentResult result = service.get().findByParent(
            FindNodesByParentParams.create().parentId(parent.id()).childOrder(order).size(20001).build());
        if (result.getTotalHits() > 20000 || result.getTotalHits() != result.getHits()) {
            throw new IllegalStateException("Cannot safely inspect all children of " + parent.id());
        }
        return result.getNodeIds().stream().map(NodeId::toString).collect(Collectors.toList());
    }

    private IndexConfigDocument indexConfig(final JsonNode json) {
        if (json == null || !json.isObject() || !json.has("default") || !json.has("allText")) {
            throw new IllegalArgumentException("Complete source index configuration is required");
        }
        final PatternIndexConfigDocument.Builder builder = PatternIndexConfigDocument.create()
            .analyzer(json.path("analyzer").asText("document_index_default")).defaultConfig(config(json.get("default")));
        for (final JsonNode entry : array(json, "configs")) {
            builder.addPattern(PathIndexConfig.create().path(PropertyPath.from(text(entry, "path")))
                                   .indexConfig(config(entry.get("config"))).build());
        }
        for (final JsonNode language : json.path("allText").path("languages")) {
            builder.addAllTextConfigLanguage(language.asText());
        }
        return builder.build();
    }

    private IndexConfig config(final JsonNode json) {
        if (json == null || !json.isObject()) {
            throw new IllegalArgumentException("Invalid index configuration");
        }
        final IndexConfig.Builder builder = IndexConfig.create()
            .decideByType(flag(json, "decideByType")).enabled(flag(json, "enabled"))
            .nGram(flag(json, "nGram")).fulltext(flag(json, "fulltext"))
            .path(flag(json, "path")).includeInAllText(flag(json, "includeInAllText"));
        for (final JsonNode language : json.path("languages")) {
            builder.addLanguage(language.asText());
        }
        for (final JsonNode processor : json.path("indexValueProcessors")) {
            builder.addIndexValueProcessor(IndexValueProcessors.get(processor.asText()));
        }
        return builder.build();
    }

    private boolean flag(final JsonNode json, final String name) {
        if (json.has(name) && !json.get(name).isBoolean()) {
            throw new IllegalArgumentException("Index flags must be booleans");
        }
        return json.path(name).asBoolean(false);
    }

    private static String text(final JsonNode json, final String key) {
        if (json == null || !json.path(key).isTextual()) {
            throw new IllegalArgumentException("Expected string field " + key);
        }
        return json.get(key).asText();
    }

    private static JsonNode array(final JsonNode json, final String key) {
        if (!json.path(key).isArray()) {
            throw new IllegalArgumentException("Expected array field " + key);
        }
        return json.get(key);
    }

    private static String withoutZone(final String value) {
        return value.endsWith("Z") ? value.substring(0, value.length() - 1) : value;
    }

    private static void checkId(final String id) {
        if (!id.matches("[a-zA-Z0-9-]{1,100}")) {
            throw new IllegalArgumentException("Invalid target content id");
        }
    }

    private static void checkPath(final String path) {
        if (!(path.equals(ROOT) || path.startsWith(ROOT + "/"))) {
            throw new IllegalArgumentException("Invalid target content path");
        }
        for (int index = 0; index < path.length(); index++) {
            final char character = path.charAt(index);
            if (character < 0x20 || character == 0x7f || character == '%' || character == '\\') {
                throw new IllegalArgumentException("Invalid target content path character");
            }
        }
        for (final String segment : path.substring(1).split("/", -1)) {
            if (segment.isEmpty() || ".".equals(segment) || "..".equals(segment)) {
                throw new IllegalArgumentException("Non-canonical target content path");
            }
        }
    }

    private static final class Patch {
        final Node node;
        ChildOrder childOrder;
        IndexConfigDocument indexConfig;
        NodeType nodeType;
        Long manualOrderValue;
        PropertyTree data;

        Patch(final Node node) {
            this.node = node;
            childOrder = node.getChildOrder();
            indexConfig = node.getIndexConfigDocument();
            nodeType = node.getNodeType();
            manualOrderValue = node.getManualOrderValue();
        }

        boolean changed() {
            return data != null || !node.getChildOrder().equals(childOrder) || !node.getIndexConfigDocument().equals(indexConfig) ||
                !node.getNodeType().equals(nodeType) || !Objects.equals(node.getManualOrderValue(), manualOrderValue);
        }
    }
}

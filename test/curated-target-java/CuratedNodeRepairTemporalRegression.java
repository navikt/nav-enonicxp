import java.lang.reflect.Field;
import java.lang.reflect.Proxy;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import java.util.function.Consumer;
import java.util.function.Supplier;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.google.common.hash.Hashing;
import com.google.common.io.ByteSource;

import com.enonic.xp.branch.Branch;
import com.enonic.xp.context.ContextBuilder;
import com.enonic.xp.data.PropertySet;
import com.enonic.xp.data.PropertyTree;
import com.enonic.xp.data.Value;
import com.enonic.xp.data.ValueFactory;
import com.enonic.xp.index.ChildOrder;
import com.enonic.xp.index.IndexConfig;
import com.enonic.xp.index.IndexConfigDocument;
import com.enonic.xp.index.PatternIndexConfigDocument;
import com.enonic.xp.node.AttachedBinaries;
import com.enonic.xp.node.AttachedBinary;
import com.enonic.xp.node.EditableNode;
import com.enonic.xp.node.Node;
import com.enonic.xp.node.NodeId;
import com.enonic.xp.node.NodePath;
import com.enonic.xp.node.NodeService;
import com.enonic.xp.node.NodeType;
import com.enonic.xp.node.NodeVersionId;
import com.enonic.xp.node.UpdateNodeParams;
import com.enonic.xp.repository.RepositoryId;
import com.enonic.xp.util.BinaryReference;
import com.enonic.xp.util.Reference;

import no.nav.navno.exports.target.CuratedNodeRepair;

/** Offline regression using real XP property/editor classes and an in-memory NodeService. */
public final class CuratedNodeRepairTemporalRegression {
    private static final Instant INSTANT = Instant.parse("1969-12-31T23:59:59.999999999Z");
    private static final Instant NESTED = Instant.parse("2026-09-08T13:14:15.000000999Z");
    private static final LocalDateTime LOCAL_DATE_TIME = LocalDateTime.parse("2024-02-29T23:59:59.123456789");
    private static final LocalTime LOCAL_TIME = LocalTime.parse("01:02:03.987654321");
    private static final byte[] BINARY = "unchanged binary".getBytes(StandardCharsets.UTF_8);
    private static final ObjectMapper JSON = new ObjectMapper();
    private static final Map<String, Node> NODES = new LinkedHashMap<>();
    private static final Map<String, Integer> READS = new LinkedHashMap<>();
    private static final CuratedNodeRepair REPAIR = new CuratedNodeRepair();
    private static final IndexConfigDocument INDEX = PatternIndexConfigDocument.create()
        .analyzer("document_index_default")
        .defaultConfig(IndexConfig.create().enabled(true).decideByType(false).fulltext(false)
            .nGram(false).includeInAllText(false).path(false).build()).build();
    private static String changeVersionOnSecondRead;
    private static int writes;
    private static int assertions;

    public static void main(final String[] args) throws Exception {
        final NodeService service = (NodeService) Proxy.newProxyInstance(
            NodeService.class.getClassLoader(), new Class<?>[]{NodeService.class}, (proxy, method, parameters) -> {
                switch (method.getName()) {
                    case "getById": {
                        final String id = parameters[0].toString();
                        final int reads = READS.merge(id, 1, Integer::sum);
                        if (id.equals(changeVersionOnSecondRead) && reads == 2) {
                            NODES.put(id, Node.create(NODES.get(id)).nodeVersionId(version()).build());
                        }
                        return NODES.get(id);
                    }
                    case "getByPath":
                        return NODES.values().stream().filter(node -> node.path().equals(parameters[0])).findFirst().orElse(null);
                    case "getBinary":
                        check(NODES.get(parameters[0].toString()).getNodeVersionId().equals(parameters[1]),
                              "Binary was not read at the observed target version");
                        return ByteSource.wrap(BINARY);
                    case "update": {
                        final UpdateNodeParams params = (UpdateNodeParams) parameters[0];
                        final EditableNode edit = new EditableNode(NODES.get(params.getId().toString()));
                        params.getEditor().edit(edit);
                        final Node updated = Node.create(edit.build()).nodeVersionId(version())
                            .timestamp(Instant.parse("2030-01-01T00:00:00Z")).build();
                        NODES.put(updated.id().toString(), updated);
                        writes++;
                        return updated;
                    }
                    case "refresh":
                        return null;
                    default:
                        throw new AssertionError("Unexpected repository operation: " + method.getName());
                }
            });
        final Field field = CuratedNodeRepair.class.getDeclaredField("service");
        field.setAccessible(true);
        field.set(REPAIR, (Supplier<NodeService>) () -> service);
        ContextBuilder.create().repositoryId(RepositoryId.from("com.enonic.cms.default")).branch(Branch.from("draft"))
            .build().callWith(() -> {
                tests();
                return null;
            });
        System.out.println("Temporal JVM regression passed " + assertions + " assertions; no live XP accessed.");
    }

    private static NodeVersionId version() {
        return NodeVersionId.from(UUID.randomUUID().toString());
    }

    private static Node node(final String id) {
        final PropertyTree data = new PropertyTree();
        data.addInstant("instant", INSTANT.truncatedTo(ChronoUnit.MILLIS));
        data.addLocalDateTime("localDateTime", LOCAL_DATE_TIME.truncatedTo(ChronoUnit.MILLIS));
        data.addLocalTime("localTime", LOCAL_TIME.truncatedTo(ChronoUnit.MILLIS));
        data.addString("label", "unchanged \uD834\uDD1E");
        data.addLong("count", Long.MAX_VALUE);
        data.addBoolean("flag", false);
        data.addReference("reference", Reference.from("other-content"));
        data.addBinaryReference("file", BinaryReference.from("file.pdf"));
        data.addInstant("optional", null);
        final PropertySet nested = data.addSet("nested");
        nested.addInstant("created", NESTED.truncatedTo(ChronoUnit.MILLIS));
        nested.addString("label", "nested unchanged");
        data.addSet("nested", null);
        final Node node = Node.create().id(NodeId.from(id)).name(id).parentPath(new NodePath("/content/www.nav.no"))
            .data(data).nodeType(NodeType.from("content")).childOrder(ChildOrder.from("_name ASC"))
            .indexConfigDocument(INDEX).timestamp(Instant.parse("2020-01-01T00:00:00Z")).nodeVersionId(version())
            .attachedBinaries(AttachedBinaries.create()
                .add(new AttachedBinary(BinaryReference.from("file.pdf"), "unchanged-blob-key")).build()).build();
        NODES.put(id, node);
        return node;
    }

    private static void scalar(final ArrayNode values, final String name, final String type, final String value) {
        values.addObject().put("name", name).put("type", type).put("value", value);
    }

    private static ObjectNode expected(final Node node) {
        final ObjectNode expected = JSON.createObjectNode();
        expected.put("formatVersion", 2).put("contentId", node.id().toString()).put("contentPath", node.path().toString())
            .put("versionId", "source-provenance-only").put("timestamp", "2001-01-01T00:00:00Z")
            .put("childOrder", "_name ASC").put("nodeType", "content");
        expected.putNull("manualOrderValue").putNull("manualChildOrder");
        final ObjectNode index = expected.putObject("indexConfig");
        index.put("analyzer", "document_index_default");
        index.putObject("default").put("enabled", true);
        index.putArray("configs");
        index.putObject("allText").putArray("languages");
        final ArrayNode properties = expected.putArray("properties");
        scalar(properties, "instant", "dateTime", INSTANT.toString());
        scalar(properties, "localDateTime", "localDateTime", LOCAL_DATE_TIME.toString());
        scalar(properties, "localTime", "localTime", LOCAL_TIME.toString());
        scalar(properties, "label", "string", "unchanged \uD834\uDD1E");
        scalar(properties, "count", "long", Long.toString(Long.MAX_VALUE));
        scalar(properties, "flag", "boolean", "false");
        scalar(properties, "reference", "reference", "other-content");
        scalar(properties, "file", "binaryReference", "file.pdf");
        scalar(properties, "optional", "dateTime", null);
        final ArrayNode nested = properties.addObject().put("name", "nested").put("type", "property-set").putArray("value");
        scalar(nested, "created", "dateTime", NESTED.toString());
        scalar(nested, "label", "string", "nested unchanged");
        properties.addObject().put("name", "nested").put("type", "property-set").putNull("value");
        expected.putArray("binaries").addObject().put("reference", "file.pdf")
            .put("sha512", Hashing.sha512().hashBytes(BINARY).toString()).put("size", Integer.toString(BINARY.length));
        return expected;
    }

    private static String batch(final ObjectNode... expectations) {
        final ObjectNode batch = JSON.createObjectNode().put("repository", "com.enonic.cms.default")
            .put("branch", "draft").put("scope", "full");
        final ArrayNode items = batch.putArray("expectations");
        for (final ObjectNode expected : expectations) {
            items.add(expected);
        }
        batch.putArray("absentContentIds");
        return batch.toString();
    }

    private static void check(final boolean condition, final String message) {
        assertions++;
        if (!condition) {
            throw new AssertionError(message);
        }
    }

    private interface Checked {
        void run() throws Exception;
    }

    private static void fails(final String message, final Checked action) throws Exception {
        try {
            action.run();
            throw new AssertionError("Expected failure: " + message);
        } catch (final IllegalStateException e) {
            check(e.getMessage().contains(message), e.toString());
        }
    }

    private static void reset() {
        NODES.clear();
        READS.clear();
        writes = 0;
        changeVersionOnSecondRead = null;
    }

    private static void replace(final PropertyTree data, final String name, final Value value) {
        data.getRoot().getProperty(name, 0).setValue(value);
    }

    private static void rejected(final Consumer<PropertyTree> change) throws Exception {
        reset();
        final Node first = node("first");
        final Node second = node("second");
        final ObjectNode firstExpected = expected(first);
        final ObjectNode secondExpected = expected(second);
        final PropertyTree changedData = second.data().copy();
        change.accept(changedData);
        NODES.put("second", Node.create(second).data(changedData).build());
        fails("typed data mismatch", () -> REPAIR.repair(batch(firstExpected, secondExpected)));
        check(writes == 0, "An invalid later entry caused earlier writes");
        check(NODES.get("first") == first, "Preflight mutated the first node");
        check(first.data().getRoot().getProperty("instant", 0).getInstant().equals(INSTANT.truncatedTo(ChronoUnit.MILLIS)),
              "Preflight mutated a shared property tree");
    }

    private static void tests() throws Exception {
        reset();
        final Node source = node("page");
        final Node unrelated = node("unrelated");
        final String input = batch(expected(source));
        fails("typed data mismatch", () -> REPAIR.validate(input));
        check(writes == 0, "Validation repaired temporal precision");
        REPAIR.repair(input);
        check(writes == 1, "Temporal-only differences were not repaired once");
        final Node repaired = NODES.get("page");
        final PropertySet data = repaired.data().getRoot();
        check(data.getProperty("instant", 0).getInstant().equals(INSTANT), "Instant precision lost");
        check(data.getProperty("localDateTime", 0).getLocalDateTime().equals(LOCAL_DATE_TIME), "LocalDateTime precision lost");
        check(data.getProperty("localTime", 0).getLocalTime().equals(LOCAL_TIME), "LocalTime precision lost");
        check(data.getProperty("nested", 0).getSet().getProperty("created", 0).getInstant().equals(NESTED),
              "Nested temporal precision lost");
        check(data.getProperty("optional", 0).getValue().isNull() && data.getProperty("nested", 1).getValue().isNull(),
              "Typed nulls or array cardinality changed");
        check(repaired.getAttachedBinaries().equals(source.getAttachedBinaries()), "Binary references or blob keys changed");
        check(NODES.get("unrelated") == unrelated, "Unselected content changed");
        REPAIR.validate(input);
        REPAIR.repair(input);
        check(writes == 1, "Exact data was not idempotent");
        check(source.data().getRoot().getProperty("instant", 0).getInstant().equals(INSTANT.truncatedTo(ChronoUnit.MILLIS)),
              "Repair mutated the original immutable node");

        rejected(tree -> replace(tree, "label", ValueFactory.newString("different text")));
        rejected(tree -> replace(tree, "instant", ValueFactory.newString(INSTANT.toString())));
        rejected(tree -> replace(tree, "instant", ValueFactory.newDateTime(INSTANT.truncatedTo(ChronoUnit.MILLIS).plusMillis(1))));
        rejected(tree -> replace(tree, "localDateTime", ValueFactory.newLocalDateTime(LOCAL_DATE_TIME.plusDays(1))));
        rejected(tree -> replace(tree, "localTime", ValueFactory.newLocalTime(LOCAL_TIME.truncatedTo(ChronoUnit.MILLIS).plusNanos(1))));
        rejected(tree -> replace(tree, "localTime", ValueFactory.newLocalTime(LocalTime.parse("01:02:03.000000987"))));
        rejected(tree -> replace(tree, "instant", ValueFactory.newDateTime(null)));
        rejected(tree -> replace(tree, "optional", ValueFactory.newDateTime(INSTANT)));
        rejected(tree -> tree.addString("extra", "must not be removed"));

        reset();
        final Node first = node("first");
        final Node second = node("second");
        changeVersionOnSecondRead = "second";
        fails("changed during preflight", () -> REPAIR.repair(batch(expected(first), expected(second))));
        check(writes == 0 && NODES.get("first") == first, "Target version checks did not precede all writes");
    }
}

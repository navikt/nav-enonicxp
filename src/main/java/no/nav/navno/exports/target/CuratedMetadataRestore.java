package no.nav.navno.exports.target;

import java.io.IOException;
import java.util.HashSet;
import java.util.Objects;
import java.util.Set;
import java.util.function.Supplier;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import com.enonic.xp.context.ContextAccessor;
import com.enonic.xp.data.PropertyPath;
import com.enonic.xp.index.ChildOrder;
import com.enonic.xp.index.IndexConfig;
import com.enonic.xp.index.IndexConfigDocument;
import com.enonic.xp.index.IndexValueProcessors;
import com.enonic.xp.index.PathIndexConfig;
import com.enonic.xp.index.PatternIndexConfigDocument;
import com.enonic.xp.node.Node;
import com.enonic.xp.node.NodeId;
import com.enonic.xp.node.NodeNotFoundException;
import com.enonic.xp.node.NodeService;
import com.enonic.xp.node.NodeType;
import com.enonic.xp.node.RefreshMode;
import com.enonic.xp.node.UpdateNodeParams;
import com.enonic.xp.script.bean.BeanContext;
import com.enonic.xp.script.bean.ScriptBean;
import com.enonic.xp.script.serializer.MapSerializable;

/**
 * Local import only; excluded from deployable builds (see build.gradle).
 * <p>
 * Native import only updates data and permissions on nodes that already exist (layer-inherited
 * content, re-imports and page imports), so this restores the remaining metadata from the source.
 * Writing the source manualOrderValue on every node keeps sibling order identical to the source.
 */
public final class CuratedMetadataRestore implements ScriptBean {
    private static final Set<String> REPOSITORIES = Set.of(
        "com.enonic.cms.default", "com.enonic.cms.navno-engelsk", "com.enonic.cms.navno-nynorsk");
    private static final String ROOT = "/content/www.nav.no";
    private static final int MAX_BATCH_SIZE = 100;
    private Supplier<NodeService> service;

    @Override
    public void initialize(final BeanContext context) {
        service = context.getService(NodeService.class);
    }

    public MapSerializable restore(final String json) throws IOException {
        final JsonNode batch = new ObjectMapper().readTree(json);
        final String repository = text(batch, "repository");
        final String branch = text(batch, "branch");
        if (!REPOSITORIES.contains(repository) || !Set.of("draft", "master").contains(branch) ||
            !repository.equals(ContextAccessor.current().getRepositoryId().toString()) ||
            !branch.equals(ContextAccessor.current().getBranch().toString())) {
            throw new IllegalArgumentException("Target context does not match an allowed CMS branch");
        }
        final JsonNode expectations = array(batch, "expectations");
        if (expectations.size() == 0 || expectations.size() > MAX_BATCH_SIZE) {
            throw new IllegalArgumentException("Expected 1 to " + MAX_BATCH_SIZE + " target entries per batch");
        }

        final Set<String> seen = new HashSet<>();
        int restored = 0;
        for (final JsonNode expected : expectations) {
            final Node node = requireNode(expected);
            if (!seen.add(node.id().toString())) {
                throw new IllegalArgumentException("Duplicate target identity: " + node.id());
            }
            if (!"content".equals(text(expected, "nodeType"))) {
                throw new IllegalArgumentException("Only CMS content node types may be restored");
            }
            final ChildOrder childOrder = ChildOrder.from(text(expected, "childOrder"));
            final IndexConfigDocument indexConfig = indexConfig(expected.get("indexConfig"));
            final NodeType nodeType = NodeType.from("content");
            final Long manualOrderValue = manualOrderValue(expected);

            if (node.getChildOrder().equals(childOrder) && node.getIndexConfigDocument().equals(indexConfig) &&
                node.getNodeType().equals(nodeType) && Objects.equals(node.getManualOrderValue(), manualOrderValue)) {
                continue;
            }
            service.get().update(UpdateNodeParams.create().id(node.id()).editor(edit -> {
                edit.childOrder = childOrder;
                edit.indexConfigDocument = indexConfig;
                edit.nodeType = nodeType;
                edit.manualOrderValue = manualOrderValue;
            }).build());
            restored++;
        }
        if (restored > 0) {
            service.get().refresh(RefreshMode.ALL);
        }

        final int checkedCount = expectations.size();
        final int restoredCount = restored;
        return gen -> {
            gen.value("checkedNodes", checkedCount);
            gen.value("restoredNodes", restoredCount);
        };
    }

    private Node requireNode(final JsonNode expected) {
        final String id = text(expected, "contentId");
        final String path = text(expected, "contentPath");
        checkId(id);
        checkPath(path);
        final Node node = getById(NodeId.from(id));
        if (node == null || !node.path().toString().equals(path)) {
            throw new IllegalStateException("Missing or misplaced target node: " + id + " at " + path);
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

    private static Long manualOrderValue(final JsonNode expected) {
        final JsonNode value = expected.get("manualOrderValue");
        if (value == null || value.isNull()) {
            return null;
        }
        if (!value.isTextual() || !value.asText().matches("-?\\d{1,19}")) {
            throw new IllegalArgumentException("manualOrderValue must be a decimal string or null");
        }
        return Long.valueOf(value.asText());
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

    private static boolean flag(final JsonNode json, final String name) {
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
}

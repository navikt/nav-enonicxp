import java.lang.reflect.Field;
import java.lang.reflect.Proxy;
import java.util.function.Supplier;
import javax.script.ScriptEngine;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.enonic.xp.data.PropertyTree;
import com.enonic.xp.data.ValueFactory;
import com.enonic.xp.node.Node;
import com.enonic.xp.node.NodeId;
import com.enonic.xp.node.NodePath;
import com.enonic.xp.node.NodeService;
import com.enonic.xp.node.NodeVersionId;
import com.enonic.xp.script.serializer.JsonMapGenerator;
import com.enonic.xp.script.serializer.MapGenerator;
import com.enonic.xp.script.impl.util.JsObjectConverter;
import org.openjdk.nashorn.api.scripting.NashornScriptEngineFactory;

import no.nav.navno.exports.CuratedNodeReader;

/** Offline regression with real XP values and Nashorn's null-omission semantics. */
public final class CuratedNodeReaderNullRegression {
    public static void main(final String[] args) throws Exception {
        final PropertyTree data = new PropertyTree();
        data.addProperty("to", ValueFactory.newDateTime(null));
        data.addProperty("group", ValueFactory.newPropertySet(null));
        data.addProperty("maximum", ValueFactory.newLong(Long.MAX_VALUE));
        data.addProperty("enabled", ValueFactory.newBoolean(false));
        data.addSet("nested").addProperty("to", ValueFactory.newDateTime(null));
        final Node node = Node.create().id(NodeId.from("content-id")).name("page")
            .parentPath(new NodePath("/content/www.nav.no"))
            .nodeVersionId(NodeVersionId.from("version-id")).data(data).build();
        final NodeService service = (NodeService) Proxy.newProxyInstance(
            NodeService.class.getClassLoader(), new Class<?>[]{NodeService.class},
            (proxy, method, parameters) -> {
                if (!method.getName().equals("getByIdAndVersionId")) {
                    throw new AssertionError("Unexpected repository operation: " + method.getName());
                }
                return node;
            });
        final CuratedNodeReader reader = new CuratedNodeReader();
        final Field field = CuratedNodeReader.class.getDeclaredField("nodeService");
        field.setAccessible(true);
        field.set(reader, (Supplier<NodeService>) () -> service);

        final JsonMapGenerator json = new JsonMapGenerator();
        final MapGenerator nashorn = (MapGenerator) Proxy.newProxyInstance(
            MapGenerator.class.getClassLoader(), new Class<?>[]{MapGenerator.class},
            (proxy, method, parameters) -> {
                // Unlike JsonMapGenerator, Nashorn skips value(key, null), but not rawValue.
                if (!(method.getName().equals("value") && parameters.length == 2 && parameters[1] == null)) {
                    method.invoke(json, parameters);
                }
                return proxy;
            });
        reader.describe("content-id", "version-id").serialize(nashorn);
        final JsonNode result = (JsonNode) json.getRoot();
        requireNull(result, "manualOrderValue");
        final JsonNode properties = result.get("properties");
        requireNull(properties.get(0), "value");
        requireNull(properties.get(1), "value");
        requireNull(properties.get(4).get("value").get(0), "value");
        if (!properties.get(2).get("value").isTextual() ||
            !properties.get(2).get("value").asText().equals("9223372036854775807") ||
            !properties.get(3).get("value").isTextual() ||
            !properties.get(3).get("value").asText().equals("false")) {
            throw new AssertionError("Scalar values must remain exact lexical strings");
        }
        final ScriptEngine engine = new NashornScriptEngineFactory().getScriptEngine();
        final JsObjectConverter converter = new JsObjectConverter(null);
        final ObjectMapper mapper = new ObjectMapper();
        final Object objectBody = engine.eval("(" + result + ")");
        final JsonNode converted = mapper.valueToTree(converter.fromJs(objectBody));
        if (converted.get("properties").get(0).has("value")) {
            throw new AssertionError("Expected XP's object response conversion to omit null values");
        }
        final Object stringBody = engine.eval("JSON.stringify(" + result + ")");
        final Object wireBody = converter.fromJs(stringBody);
        if (!(wireBody instanceof String) || !mapper.readTree((String) wireBody).equals(result)) {
            throw new AssertionError("Pre-serialized JSON must preserve nulls through XP response conversion");
        }
        System.out.println("Curated reader and JSON response preserve typed nulls and exact lexical values.");
    }

    private static void requireNull(final JsonNode object, final String key) {
        if (!object.has(key) || !object.get(key).isNull()) {
            throw new AssertionError("Missing explicit null for " + key + ": " + object);
        }
    }
}

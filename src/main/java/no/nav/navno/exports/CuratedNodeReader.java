package no.nav.navno.exports;

import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeFormatterBuilder;
import java.time.temporal.ChronoField;
import java.util.LinkedHashSet;
import java.util.Set;
import java.util.function.Supplier;

import com.google.common.io.ByteSource;

import com.enonic.xp.data.Property;
import com.enonic.xp.data.ValueType;
import com.enonic.xp.data.ValueTypes;
import com.enonic.xp.node.AttachedBinary;
import com.enonic.xp.node.Node;
import com.enonic.xp.node.NodeId;
import com.enonic.xp.node.NodeService;
import com.enonic.xp.node.NodeVersionId;
import com.enonic.xp.script.bean.BeanContext;
import com.enonic.xp.script.bean.ScriptBean;
import com.enonic.xp.script.serializer.MapGenerator;
import com.enonic.xp.script.serializer.MapSerializable;
import com.enonic.xp.util.BinaryReference;

public final class CuratedNodeReader implements ScriptBean {
    private static final String CONTENT_ROOT = "/content/www.nav.no";
    private static final String VALUE_FIELD = "value";
    private static final DateTimeFormatter DATE_TIME =
        new DateTimeFormatterBuilder().appendPattern("yyyy-MM-dd'T'HH:mm:ss")
            .appendFraction(ChronoField.NANO_OF_SECOND, 3, 9, true).appendLiteral('Z')
            .toFormatter().withZone(ZoneOffset.UTC);
    private static final DateTimeFormatter LOCAL_TIME =
        new DateTimeFormatterBuilder().appendPattern("HH:mm:ss")
            .appendFraction(ChronoField.NANO_OF_SECOND, 3, 9, true).appendLiteral('Z').toFormatter();
    private static final DateTimeFormatter LOCAL_DATE = DateTimeFormatter.ofPattern("yyyy-MM-dd'Z'");

    private Supplier<NodeService> nodeService;

    @Override
    public void initialize(final BeanContext context) {
        nodeService = context.getService(NodeService.class);
    }

    public MapSerializable describe(final String contentId, final String versionId) {
        final Node node = readNode(contentId, versionId);
        return gen -> {
            gen.value("versionId", node.getNodeVersionId().toString());
            gen.rawValue("manualOrderValue",
                      node.getManualOrderValue() == null ? null : node.getManualOrderValue().toString());
            gen.array("properties");
            for (final Property property : node.data().getProperties()) {
                serializeProperty(gen, property);
            }
            gen.end();
            gen.array("binaryReferences");
            binaryReferences(node).forEach(gen::value);
            gen.end();
        };
    }

    public ByteSource readBinary(final String contentId, final String versionId, final String reference) {
        final Node node = readNode(contentId, versionId);
        if (!binaryReferences(node).contains(reference)) {
            throw new IllegalArgumentException("Binary reference is not attached to the selected version");
        }
        return nodeService.get().getBinary(node.id(), node.getNodeVersionId(), BinaryReference.from(reference));
    }

    private Node readNode(final String contentId, final String versionId) {
        if (versionId == null || versionId.isBlank()) {
            throw new IllegalArgumentException("An explicit node version is required");
        }
        final Node node = nodeService.get().getByIdAndVersionId(NodeId.from(contentId), NodeVersionId.from(versionId));
        if (node == null || !(node.path().toString().equals(CONTENT_ROOT) ||
                              node.path().toString().startsWith(CONTENT_ROOT + "/"))) {
            throw new IllegalArgumentException("Selected content version was not found under the curated root");
        }
        return node;
    }

    private Set<String> binaryReferences(final Node node) {
        final Set<String> references = new LinkedHashSet<>();
        for (final AttachedBinary binary : node.getAttachedBinaries()) {
            references.add(binary.getBinaryReference().toString());
        }
        return references;
    }

    private void serializeProperty(final MapGenerator gen, final Property property) {
        final String type = xmlType(property.getType());
        gen.map();
        gen.value("name", property.getName());
        gen.value("type", type);
        if (property.getValue().isNull()) {
            // XP's Nashorn map generator omits nulls unless they are written as raw values.
            gen.rawValue(VALUE_FIELD, null);
        } else if (property.getType().equals(ValueTypes.PROPERTY_SET)) {
            gen.array(VALUE_FIELD);
            for (final Property child : property.getSet().getProperties()) {
                serializeProperty(gen, child);
            }
            gen.end();
        } else {
            gen.value(VALUE_FIELD, scalarValue(property));
        }
        gen.end();
    }

    private String scalarValue(final Property property) {
        final ValueType type = property.getType();
        if (type.equals(ValueTypes.DATE_TIME)) {
            return DATE_TIME.format(property.getInstant());
        }
        if (type.equals(ValueTypes.LOCAL_DATE_TIME)) {
            return DATE_TIME.format(property.getLocalDateTime());
        }
        if (type.equals(ValueTypes.LOCAL_TIME)) {
            return LOCAL_TIME.format(property.getLocalTime());
        }
        if (type.equals(ValueTypes.LOCAL_DATE)) {
            return LOCAL_DATE.format(property.getLocalDate());
        }
        return property.getValue().toString();
    }

    private String xmlType(final ValueType type) {
        if (type.equals(ValueTypes.STRING)) {
            return "string";
        }
        if (type.equals(ValueTypes.BOOLEAN)) {
            return "boolean";
        }
        if (type.equals(ValueTypes.LONG)) {
            return "long";
        }
        if (type.equals(ValueTypes.DOUBLE)) {
            return "double";
        }
        if (type.equals(ValueTypes.XML)) {
            return "xml";
        }
        if (type.equals(ValueTypes.GEO_POINT)) {
            return "geoPoint";
        }
        if (type.equals(ValueTypes.DATE_TIME)) {
            return "dateTime";
        }
        if (type.equals(ValueTypes.LOCAL_DATE_TIME)) {
            return "localDateTime";
        }
        if (type.equals(ValueTypes.LOCAL_DATE)) {
            return "localDate";
        }
        if (type.equals(ValueTypes.LOCAL_TIME)) {
            return "localTime";
        }
        if (type.equals(ValueTypes.REFERENCE)) {
            return "reference";
        }
        if (type.equals(ValueTypes.LINK)) {
            return "link";
        }
        if (type.equals(ValueTypes.BINARY_REFERENCE)) {
            return "binaryReference";
        }
        if (type.equals(ValueTypes.PROPERTY_SET)) {
            return "property-set";
        }
        throw new IllegalArgumentException("Unsupported XP property type: " + type);
    }
}

package no.nav.navno.xp8migration;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.function.Consumer;
import java.util.stream.Collectors;
import java.util.stream.StreamSupport;

import com.enonic.xp.app.ApplicationKey;
import com.enonic.xp.app.ApplicationKeys;
import com.enonic.xp.content.Content;
import com.enonic.xp.content.ContentId;
import com.enonic.xp.content.ContentInheritType;
import com.enonic.xp.content.ContentNotFoundException;
import com.enonic.xp.content.ContentService;
import com.enonic.xp.content.Media;
import com.enonic.xp.content.MediaUtils;
import com.enonic.xp.content.Mixin;
import com.enonic.xp.content.ContentPropertyNames;
import com.enonic.xp.data.Property;
import com.enonic.xp.data.PropertySet;
import com.enonic.xp.data.PropertyTree;
import com.enonic.xp.descriptor.DescriptorKey;
import com.enonic.xp.form.Form;
import com.enonic.xp.form.Input;
import com.enonic.xp.form.InputVisitor;
import com.enonic.xp.inputtype.InputType;
import com.enonic.xp.inputtype.InputTypes;
import com.enonic.xp.page.Page;
import com.enonic.xp.page.PageDescriptor;
import com.enonic.xp.page.PageDescriptorService;
import com.enonic.xp.page.PageTemplate;
import com.enonic.xp.region.Component;
import com.enonic.xp.region.DescriptorBasedComponent;
import com.enonic.xp.region.LayoutComponent;
import com.enonic.xp.region.LayoutDescriptor;
import com.enonic.xp.region.LayoutDescriptorService;
import com.enonic.xp.region.PartComponent;
import com.enonic.xp.region.PartDescriptor;
import com.enonic.xp.region.PartDescriptorService;
import com.enonic.xp.region.Region;
import com.enonic.xp.region.Regions;
import com.enonic.xp.schema.content.ContentType;
import com.enonic.xp.schema.content.ContentTypeName;
import com.enonic.xp.schema.content.ContentTypeService;
import com.enonic.xp.schema.content.GetContentTypeParams;
import com.enonic.xp.schema.mixin.MixinDescriptor;
import com.enonic.xp.schema.mixin.MixinName;
import com.enonic.xp.schema.mixin.MixinService;
import com.enonic.xp.script.bean.BeanContext;
import com.enonic.xp.script.bean.ScriptBean;
import com.enonic.xp.script.serializer.MapGenerator;
import com.enonic.xp.script.serializer.MapSerializable;
import com.enonic.xp.site.CmsDescriptor;
import com.enonic.xp.site.CmsService;
import com.enonic.xp.site.MixinMappingService;
import com.enonic.xp.site.MixinOption;
import com.enonic.xp.site.MixinOptions;
import com.enonic.xp.site.SiteConfig;
import com.enonic.xp.site.SiteConfigService;
import com.enonic.xp.site.SiteConfigs;
import com.enonic.xp.site.SiteConfigsDataSerializer;

// XP7: Exists only for the XP 7 -> 8 upgrade and is removed with XP 7. Read-only: replicates the checks XP 8.1.2
// runs on save (AbstractCreatingOrUpdatingContentCommand), but collects every error instead of throwing on the first.
public final class SaveValidationScanner implements ScriptBean {
    private ContentService contentService;
    private ContentTypeService contentTypeService;
    private MixinService mixinService;
    private MixinMappingService mixinMappingService;
    private SiteConfigService siteConfigService;
    private CmsService cmsService;
    private PageDescriptorService pageDescriptorService;
    private PartDescriptorService partDescriptorService;
    private LayoutDescriptorService layoutDescriptorService;

    @Override
    public void initialize(final BeanContext context) {
        contentService = context.getService(ContentService.class).get();
        contentTypeService = context.getService(ContentTypeService.class).get();
        mixinService = context.getService(MixinService.class).get();
        mixinMappingService = context.getService(MixinMappingService.class).get();
        siteConfigService = context.getService(SiteConfigService.class).get();
        cmsService = context.getService(CmsService.class).get();
        pageDescriptorService = context.getService(PageDescriptorService.class).get();
        partDescriptorService = context.getService(PartDescriptorService.class).get();
        layoutDescriptorService = context.getService(LayoutDescriptorService.class).get();
    }

    private record ScanError(String area, String kind, String componentPath, String descriptor, String propertyPath,
                             String inputType, String message) {
        // Missing schemas/descriptors make XP skip validation, so they do not block saving
        boolean blocking() {
            return !kind.startsWith("unknown");
        }
    }

    public MapSerializable scan(final String contentId) {
        final List<ScanError> errors = new ArrayList<>();
        Content found;
        try {
            found = contentService.getById(ContentId.from(contentId));
        } catch (final ContentNotFoundException e) {
            found = null;
        }
        final Content content = found;

        return gen -> {
            if (content == null) {
                gen.value("found", false);
                return;
            }
            scanContent(content, errors);
            gen.value("found", true);
            gen.value("path", content.getPath().toString());
            gen.value("type", content.getType().toString());
            gen.value("inherited", content.getInherit() != null && content.getInherit().contains(ContentInheritType.CONTENT));
            gen.array("errors");
            errors.stream().filter(ScanError::blocking).forEach(error -> serialize(gen, error));
            gen.end();
            gen.array("warnings");
            errors.stream().filter(error -> !error.blocking()).forEach(error -> serialize(gen, error));
            gen.end();
        };
    }

    private void serialize(final MapGenerator gen, final ScanError error) {
        gen.map();
        gen.value("area", error.area());
        gen.value("kind", error.kind());
        gen.value("componentPath", error.componentPath());
        gen.value("descriptor", error.descriptor());
        gen.value("propertyPath", error.propertyPath());
        gen.value("inputType", error.inputType());
        gen.value("message", error.message());
        gen.end();
    }

    private void scanContent(final Content content, final List<ScanError> errors) {
        guarded("data", null, errors, () -> scanData(content, errors));
        guarded("mixin", null, errors, () -> scanMixinsAllowed(content, errors));
        guarded("mixin", null, errors, () -> scanMixins(content, errors));
        guarded("page", null, errors, () -> scanPage(content.getPage(), errors));
        guarded("siteConfig", null, errors, () -> scanSiteConfigs(content.getData(), errors));
        guarded("media", null, errors, () -> scanMediaFocalPoint(content, errors));
    }

    // Same as UpdateContentCommand.validateImageMediaProperties
    private void scanMediaFocalPoint(final Content content, final List<ScanError> errors) {
        if (!(content instanceof Media media)) {
            return;
        }
        try {
            MediaUtils.readFocalPoint(media.getData().getSet(ContentPropertyNames.MEDIA));
        } catch (final IllegalArgumentException e) {
            errors.add(new ScanError("media", "invalidFocalPoint", null, null, null, null, describe(e)));
        }
    }

    private void guarded(final String area, final String descriptor, final List<ScanError> errors, final Runnable action) {
        try {
            action.run();
        } catch (final Exception e) {
            errors.add(new ScanError(area, "scanFailure", null, descriptor, null, null, describe(e)));
        }
    }

    private void scanData(final Content content, final List<ScanError> errors) {
        final ContentTypeName typeName = content.getType();
        if (typeName.isUnstructured()) {
            return;
        }
        final ContentType contentType = contentTypeService.getByName(new GetContentTypeParams().contentTypeName(typeName));
        if (contentType == null) {
            errors.add(new ScanError("data", "unknownContentType", null, typeName.toString(), null, null,
                                     "Content type not found (XP skips data validation on save)"));
            return;
        }
        validateForm(contentType.getForm(), content.getData(), "data", null, typeName.toString(), errors);
    }

    private void scanMixinsAllowed(final Content content, final List<ScanError> errors) {
        final ApplicationKeys.Builder appKeys = ApplicationKeys.create().add(ApplicationKey.PORTAL);
        final SiteConfigs siteConfigs = content.getType().isSite()
            ? SiteConfigsDataSerializer.fromData(content.getData().getRoot())
            : siteConfigService.getSiteConfigs(content.getParentPath());
        siteConfigs.stream().map(SiteConfig::getApplicationKey).forEach(appKeys::add);

        final MixinOptions options = mixinMappingService.getMixinMappingOptions(content.getType(), appKeys.build());
        final Set<MixinName> allowed =
            options.stream().map(MixinOption::mixinDescriptor).map(MixinDescriptor::getName).collect(Collectors.toSet());

        for (final Mixin mixin : content.getMixins()) {
            if (!allowed.contains(mixin.getName())) {
                errors.add(new ScanError("mixinNotAllowed", "mixinNotAllowed", null, mixin.getName().toString(), null, null,
                                         "Not allowed mixinName: " + mixin.getName()));
            }
        }
    }

    private void scanMixins(final Content content, final List<ScanError> errors) {
        for (final Mixin mixin : content.getMixins()) {
            final String name = mixin.getName().toString();
            guarded("mixin", name, errors, () -> {
                final MixinDescriptor descriptor = mixinService.getByName(mixin.getName());
                if (descriptor == null) {
                    errors.add(new ScanError("mixin", "unknownMixin", null, name, null, null,
                                             "Mixin descriptor not found (XP skips validation on save)"));
                    return;
                }
                validateForm(descriptor.getForm(), mixin.getData(), "mixin", null, name, errors);
            });
        }
    }

    private void scanSiteConfigs(final PropertyTree data, final List<ScanError> errors) {
        for (final SiteConfig siteConfig : SiteConfigsDataSerializer.fromData(data.getRoot())) {
            final String appKey = siteConfig.getApplicationKey().toString();
            guarded("siteConfig", appKey, errors, () -> {
                final CmsDescriptor descriptor = cmsService.getDescriptor(siteConfig.getApplicationKey());
                if (descriptor == null) {
                    errors.add(new ScanError("siteConfig", "unknownDescriptor", null, appKey, null, null,
                                             "Site config descriptor not found (XP skips validation on save)"));
                    return;
                }
                validateForm(descriptor.getForm(), siteConfig.getConfig(), "siteConfig", null, appKey, errors);
            });
        }
    }

    private void scanPage(final Page page, final List<ScanError> errors) {
        if (page == null) {
            return;
        }

        DescriptorKey pageKey = null;
        try {
            pageKey = getPageDescriptorKey(page);
        } catch (final ContentNotFoundException e) {
            // XP also throws here on save
            errors.add(new ScanError("page", "pageTemplateNotFound", "/", null, null, null, describe(e)));
        } catch (final ClassCastException e) {
            errors.add(new ScanError("page", "pageTemplateWrongType", "/", null, null, null, describe(e)));
        }
        if (pageKey != null) {
            final DescriptorKey key = pageKey;
            guarded("page", key.toString(), errors, () -> {
                final PageDescriptor descriptor = pageDescriptorService.getByKey(key);
                if (descriptor == null) {
                    errors.add(new ScanError("page", "unknownDescriptor", "/", key.toString(), null, null,
                                             "Page descriptor not found (XP skips validation on save)"));
                    return;
                }
                validateForm(descriptor.getConfig(), page.getConfig(), "page", "/", key.toString(), errors);
            });
        }

        if (page.hasRegions()) {
            scanRegions(page.getRegions(), errors);
        }
    }

    private DescriptorKey getPageDescriptorKey(final Page page) {
        if (page.hasDescriptor()) {
            return page.getDescriptor();
        }
        if (page.hasTemplate()) {
            // XP casts without checking the type, so a non-template reference fails the save
            final PageTemplate pageTemplate = (PageTemplate) contentService.getById(page.getTemplate().getContentId());
            if (pageTemplate.getPage() != null && pageTemplate.getPage().hasDescriptor()) {
                return pageTemplate.getPage().getDescriptor();
            }
        }
        return null;
    }

    private void scanRegions(final Regions regions, final List<ScanError> errors) {
        for (final Region region : regions) {
            for (final Component component : region.getComponents()) {
                if (!(component instanceof DescriptorBasedComponent descriptorBased) || !descriptorBased.hasDescriptor()) {
                    continue;
                }
                final String path = component.getPath().toString();
                final String key = descriptorBased.getDescriptor().toString();
                if (descriptorBased instanceof PartComponent part) {
                    guarded("part", key, errors, () -> {
                        final PartDescriptor descriptor = partDescriptorService.getByKey(part.getDescriptor());
                        if (descriptor == null) {
                            errors.add(new ScanError("part", "unknownDescriptor", path, key, null, null,
                                                     "Part descriptor not found (XP skips validation on save)"));
                            return;
                        }
                        validateForm(descriptor.getConfig(), part.getConfig(), "part", path, key, errors);
                    });
                } else if (descriptorBased instanceof LayoutComponent layout) {
                    guarded("layout", key, errors, () -> {
                        final LayoutDescriptor descriptor = layoutDescriptorService.getByKey(layout.getDescriptor());
                        if (descriptor == null) {
                            errors.add(new ScanError("layout", "unknownDescriptor", path, key, null, null,
                                                     "Layout descriptor not found (XP skips validation, including nested regions, on save)"));
                            return;
                        }
                        validateForm(descriptor.getConfig(), layout.getConfig(), "layout", path, key, errors);
                        if (layout.hasRegions()) {
                            scanRegions(layout.getRegions(), errors);
                        }
                    });
                }
            }
        }
    }

    private void validateForm(final Form form, final PropertyTree data, final String area, final String componentPath,
                              final String descriptor, final List<ScanError> errors) {
        if (form == null || data == null) {
            return;
        }
        new InputVisitor() {
            @Override
            public void visit(final Input input) {
                try {
                    visitProperties(input, data, property -> {
                        try {
                            // Resolved per property like XP, so unknown input types without values pass
                            final InputType inputType = InputTypes.BUILTIN.resolve(input.getInputType());
                            inputType.validate(property, input.getInputTypeConfig());
                        } catch (final Exception e) {
                            errors.add(new ScanError(area, "inputValidation", componentPath, descriptor, property.getPath().toString(),
                                                     input.getInputType().toString(), describe(e)));
                        }
                    });
                } catch (final Exception e) {
                    errors.add(new ScanError(area, "scanFailure", componentPath, descriptor, input.getPath().toString(),
                                             input.getInputType().toString(), describe(e)));
                }
            }
        }.traverse(form);
    }

    // Same traversal as XP's (non-public) InputVisitorHelper.visitProperties
    private static void visitProperties(final Input input, final PropertyTree data, final Consumer<Property> consumer) {
        final List<String> elements = input.getPath().getElements();
        final int nameIndex = elements.size() - 1;

        List<PropertySet> currentSets = List.of(data.getRoot());
        for (final String element : elements.subList(0, nameIndex)) {
            currentSets = currentSets.stream()
                .flatMap(set -> StreamSupport.stream(set.getSets(element).spliterator(), false))
                .collect(Collectors.toList());
        }

        final String inputName = elements.get(nameIndex);
        currentSets.stream().flatMap(set -> set.getProperties(inputName).stream()).forEach(consumer);
    }

    private static String describe(final Throwable e) {
        return e.getClass().getSimpleName() + ": " + e.getMessage();
    }
}

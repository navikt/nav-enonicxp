package no.nav.navno.curatedexport.target;

import java.util.function.Supplier;

import com.enonic.xp.app.ApplicationKey;
import com.enonic.xp.data.PropertyTree;
import com.enonic.xp.script.bean.BeanContext;
import com.enonic.xp.script.bean.ScriptBean;
import com.enonic.xp.script.serializer.MapSerializable;
import com.enonic.xp.security.CreateIdProviderParams;
import com.enonic.xp.security.CreateUserParams;
import com.enonic.xp.security.IdProviderConfig;
import com.enonic.xp.security.IdProviderKey;
import com.enonic.xp.security.PrincipalKey;
import com.enonic.xp.security.SecurityService;

/**
 * Local import only; excluded from deployable builds (see build.gradle).
 * <p>
 * Curated imports do not copy the system repo, so the app's id provider and the user it logs layer
 * requests in as are missing. The source project viewer roles already list the user as a member.
 */
public final class CuratedLayersLogin implements ScriptBean {
    private Supplier<SecurityService> service;
    private ApplicationKey applicationKey;

    @Override
    public void initialize(final BeanContext context) {
        service = context.getService(SecurityService.class);
        applicationKey = context.getApplicationKey();
    }

    public MapSerializable ensure(final String idProviderName, final String userLogin) {
        final SecurityService securityService = service.get();
        final IdProviderKey idProviderKey = IdProviderKey.from(idProviderName);
        final PrincipalKey userKey = PrincipalKey.ofUser(idProviderKey, userLogin);

        final boolean createIdProvider = securityService.getIdProvider(idProviderKey) == null;
        if (createIdProvider) {
            securityService.createIdProvider(CreateIdProviderParams.create()
                .key(idProviderKey)
                .displayName(idProviderName)
                .idProviderConfig(IdProviderConfig.create()
                    .applicationKey(applicationKey)
                    .config(new PropertyTree())
                    .build())
                .build());
        }

        final boolean createUser = securityService.getUser(userKey).isEmpty();
        if (createUser) {
            securityService.createUser(CreateUserParams.create()
                .userKey(userKey)
                .displayName(userLogin)
                .login(userLogin)
                .build());
        }

        return gen -> {
            gen.value("createdIdProvider", createIdProvider);
            gen.value("createdUser", createUser);
        };
    }
}

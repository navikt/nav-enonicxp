package tools;

import java.util.HashMap;
import java.util.Map;

// import com.enonic.xp.content.Content;
import com.enonic.xp.content.ContentId;
import com.enonic.xp.content.ContentService;
import com.enonic.xp.content.ContentVersion;
// import com.google.gson.GsonBuilder;
// import com.google.gson.Gson;
import com.enonic.xp.content.ContentVersionId;
import com.enonic.xp.content.ContentVersionPublishInfo;
import com.enonic.xp.content.FindContentVersionsParams;
import com.enonic.xp.content.FindContentVersionsResult;
import com.enonic.xp.content.WorkflowState;
import com.enonic.xp.script.bean.BeanContext;
import com.enonic.xp.script.bean.ScriptBean;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

public class PublishedVersions implements ScriptBean {
    private BeanContext context;
    private ContentService contentService;
    private FindContentVersionsParams.Builder builder;

    public PublishedVersions() {
        this.builder = FindContentVersionsParams.create();
    }

    @Override
    public void initialize(final BeanContext context) {
        this.contentService = context.getService(ContentService.class).get();
        this.context = context;
    }

    Map<String, String> map = new HashMap<>();

    public String getLiveVersions(String contentId) throws JsonProcessingException {
        FindContentVersionsParams params = builder.contentId(ContentId.from(contentId)).from(0).size(1000).build();
        var contentVersions = contentService.getVersions(params);
        for (final ContentVersion contentVersion : contentVersions.getContentVersions()) {
            ContentVersionId id = contentVersion.getId();
            WorkflowState workflowState = contentVersion.getWorkflowInfo().getState();
            ContentVersionPublishInfo publishInfo = contentVersion.getPublishInfo();
            String name = contentVersion.getDisplayName();

            if (publishInfo != null & workflowState == WorkflowState.READY) {
                map.put(id.toString(), publishInfo.getTimestamp().toString());
            }
        }

        ObjectMapper mapper = new ObjectMapper();
        String jsonResult = mapper.writerWithDefaultPrettyPrinter().writeValueAsString(map);
        return jsonResult;
    }
    // public Map<String, Object> getVersions(String contentId){

    // }
}

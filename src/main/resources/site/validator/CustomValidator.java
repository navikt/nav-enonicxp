package com.example.validator;

import com.enonic.xp.content.Content;
import com.enonic.xp.content.ContentPath;
import com.enonic.xp.validation.ContentValidator;
import com.enonic.xp.validation.ValidationErrors;
import org.osgi.service.component.annotations.Component;

@Component(immediate = true, service = ContentValidator.class)
public class CustomContentValidator implements ContentValidator {

    @Override
    public void validate(Content content, ValidationErrors validationErrors) {
        // Validation logic here
        String contentName = content.getName();
        if (contentName.contains(" ")) {
            validationErrors.add(
                    ContentPath.from(content.getPath()),
                    "Content name cannot contain spaces."
            );
        }

        // Example: Validate a field in the content data
        String title = content.getData().getString("title");
        if (title == null || title.isEmpty()) {
            validationErrors.add(
                    ContentPath.from(content.getPath()).child("data").child("title"),
                    "The 'title' field must not be empty."
            );

        // Example: Make sure formNumbers regex is /^NAV\s\d{2}-\d{2}\.\d{2}$/ (e.g. NAV 01-01.01)
        String formNumbers = content.getData().getString("formNumbers");
        if (inputField == null || !inputField.matches("^NAV\\s\\d{2}-\\d{2}\\.\\d{2}$")) {
            validationErrors.add(ContentPath.from(content.getPath()).child("data").child("formNumbers"), "Skjemanummer må være på formatet 'NAV XX-XX.XX'");
        }

    }
}

package tools;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.List;
import java.util.*;
import java.util.stream.*;

public final class HtmlCleaner {
    private Boolean isEmpty(Element current) {
        String content = current.text().trim();
        return content.equals("nbsp;") || content.isEmpty();
    }

    public String clean(String htmlString) {
        Document doc = Jsoup.parse(htmlString);

        // Remove empty ul- & li-tags
        Elements uls = doc.select("ul");
        for (Element elem: uls) {
            for(Element child: elem.children()){
                String content = child.text();
                if (content.equals("nbsp;") || content.isEmpty()){
                    child.remove();
                }
            }
            if (elem.childrenSize() == 0) {
                elem.remove();
            }
        }

        Elements allTags = doc.body().select("*");
        String[] hTags = {"h1", "h2", "h3", "h4"};
        String[] ignoredElements = {"body", "br"};
        for (Element elem: allTags) {
            if (Arrays.stream(ignoredElements).anyMatch(elem.tagName()::equals) {
                continue;
            }
            // convert empty h-tags to p
            if (Arrays.stream(hTags).anyMatch(elem.tagName()::equals) && this.isEmpty(elem )) {
                elem.tagName("p");
                elem.text("");
            }
            // strip formatting chars
            if (!elem.text().equals("")) {
                String content = elem.text();
                String cleanContent = content.trim().replace("\n", " ").replace("\r", "").replace("\t", "");
                elem.text(cleanContent);
            }
            // remove any empty tags
            if (!elem.tagName().equals("p") && elem.childrenSize() == 0 && (!elem.hasText() || this.isEmpty(elem))) {
                elem.remove();
            }
        }
        return doc.body().html();
    }
}

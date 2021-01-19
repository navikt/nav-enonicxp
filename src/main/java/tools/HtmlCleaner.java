package tools;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import java.util.Arrays;

public final class HtmlCleaner {
    private Boolean isEmpty(Element current) {
        String content = current.text().trim();
        return content.equals("nbsp;") || content.isEmpty();
    }

    public String clean(String htmlString) {
        Document doc = Jsoup.parse(htmlString);

        // Remove empty ul- & li-tags to ensure WCAG-rules
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
        String[] hTags = {"h1", "h2", "h3", "h4", "h5", "h6"};
        String[] ignoredElements = {"body", "br"};
        for (Element elem: allTags) {
            if (Arrays.asList(ignoredElements).contains(elem.tagName())) {
                continue;
            }
            // convert empty h-tags to p to ensure WCAG-rules
            if (Arrays.asList(hTags).contains(elem.tagName()) && this.isEmpty(elem )) {
                elem.tagName("p");
                elem.html("&nbsp;"); // To ensure p gets height
            }
            // strip formatting chars
            if (!elem.text().equals("")) {
                String content = elem.text();
                String cleanContent = content.trim()
                    .replace("\n", " ")
                    .replace("\r", "")
                    .replace("\t", "");
                elem.text(cleanContent);
            }
        }
        return doc.body().html();
    }
}

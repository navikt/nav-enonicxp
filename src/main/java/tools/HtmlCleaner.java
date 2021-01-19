package tools;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;

public final class HtmlCleaner {
    private Boolean isEmpty(Element current) {
        String content = current.text().trim();
        return content.equals("nbsp;") || content.isEmpty();
    }

    public String clean(String htmlString) {
        Document doc = Jsoup.parse(htmlString);

        // Remove empty ul- & li-tags to ensure WCAG-rules
        Elements ulTags = doc.body().select("ul");
        for (Element elem: ulTags) {
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

        // Convert empty h-tags to p to ensure WCAG-rules
        Elements hTags = doc.body().select("h1, h2, h3, h4, h5, h6");
        for (Element elem: hTags) {
            if (this.isEmpty(elem)) {
                elem.tagName("p");
                elem.html("&nbsp;"); // To ensure p gets height
            }
        }

        // Remove empty div-tags (to avoid unnecessary spacing largeTable)
        Elements divTags = doc.body().select("div");
        for (Element elem: divTags) {
            String content = elem.text();
            if (content.equals("nbsp;") || content.isEmpty()){
                elem.remove();
            }
        }

        return doc.body().html();
    }
}

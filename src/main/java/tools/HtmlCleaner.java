package tools;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.List;

public final class HtmlCleaner {
    public String clean(String htmlString) {
        Document doc = Jsoup.parse(htmlString);

        // handle empty h-tags --> p
        Elements headers = doc.select("h1, h2, h3, h4");
        for (Element heading : headers) {
            String content = heading.text();
            if (content.equals("nbsp;") || content.isEmpty()){
                heading.tagName("p");
                heading.text("");
            }
        }
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

        // TODO: Remove tabs and linebreaks
        // TODO: Strip all spaces if children are just text
        return doc.body().html();
    }
}

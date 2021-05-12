import contentLib from '/lib/xp/content';
import { Content } from 'enonic-types/content';
import { SectionPage } from '../site/content-types/section-page/section-page';
import { PageWithSideMenusConfig } from '../site/pages/page-with-side-menus/page-with-side-menus-config';

export const tstest = () => {
  const sectionPage = contentLib.get<SectionPage>({
    key: '/www.nav.no/no/samarbeidspartner',
  });

  if (sectionPage) {
    log.info(sectionPage.data.newsContents);
  }

  const productPage = contentLib.get<Content<any, PageWithSideMenusConfig, any>>({
    key: '/www.nav.no/no/produktside-test',
  });

  if (productPage) {
    log.info(JSON.stringify(productPage.page.config));
  }
};

import contentLib from '/lib/xp/content';
import { SectionPage } from '../site/content-types/section-page/section-page';
import { PageWithSideMenusConfig } from '../site/pages/page-with-side-menus/page-with-side-menus-config';

export const tstest = () => {
  const sectionPage = contentLib.get<SectionPage>({
    key: '/www.nav.no/no/samarbeidspartner',
  });
  log.info(JSON.stringify(sectionPage));

  if (sectionPage) {
    log.info(sectionPage.data.newsContents);
  }

  const productPage = contentLib.get<PageWithSideMenusConfig>({
    key: '/www.nav.no/no/produktside-test',
  });
  log.info(JSON.stringify(productPage));

  if (productPage) {
    log.info(productPage.data.leftMenuHeader);
  }
};

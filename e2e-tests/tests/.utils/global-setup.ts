import { getXpTestContainer } from './xp-test-container';

const globalSetup = async () => {
    await getXpTestContainer();
};

export default globalSetup;

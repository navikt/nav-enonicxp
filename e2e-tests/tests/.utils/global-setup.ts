import { startXpTestContainer } from './xp-test-container';

const globalSetup = async () => {
    await startXpTestContainer();
};

export default globalSetup;

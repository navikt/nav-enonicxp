import { stopXpTestContainer } from './xp-test-container';

const globalTeardown = async () => {
    return stopXpTestContainer();
};

export default globalTeardown;

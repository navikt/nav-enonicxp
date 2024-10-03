import { getXpTestContainer } from './xp-test-container';

const globalTeardown = async () => {
    return (await getXpTestContainer()).stop();
};

export default globalTeardown;

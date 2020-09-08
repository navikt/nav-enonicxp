const libs = {
    content: require('/lib/xp/content'),
};

const handleGet = () => {
    const chatConfig = libs.content.get({
        key: '/www.nav.no/chatbot/chatbot-config',
    });

    return {
        body: chatConfig.data || {},
        contentType: 'application/json',
    };
};

exports.get = handleGet;

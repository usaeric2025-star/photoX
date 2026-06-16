import { groupPhotos } from '../src/services/group/commands';

const run = async () => {
    try {
        const res = await groupPhotos(['some-photo-id']);
        console.log("Success:", res);
    } catch (e: any) {
        console.error("Error group photos:", e.message);
    }
};

run();

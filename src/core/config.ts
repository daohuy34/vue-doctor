import { cosmiconfig } from 'cosmiconfig';

export async function loadConfig() {
    const explorer = cosmiconfig('vue-doctor');

    const result = await explorer.search();

    return (
        result?.config ?? {
            rules: {},
        }
    );
}

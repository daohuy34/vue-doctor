import { cosmiconfig } from 'cosmiconfig';

import type { VueDoctorConfig } from '../types/config';

export async function loadConfig(): Promise<VueDoctorConfig> {
    const explorer = cosmiconfig('vue-doctor');

    const result = await explorer.search();

    const userConfig = result?.config ?? {};

    return {
        rules: userConfig.rules ?? {},

        failOnWarning: userConfig.failOnWarning ?? true,

        plugins: userConfig.plugins ?? [],
    };
}

import { ruleMetadata } from '../../rules/metadata';

export async function rulesCommand() {
    console.log('\nAvailable rules:\n');

    for (const rule of ruleMetadata) {
        console.log(`• ${rule.name} (${rule.category})`);
    }
}

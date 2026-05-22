import { ruleMetadata } from '../../rules/metadata';

export async function ruleCommand(name: string) {
    const rule = ruleMetadata.find((r) => r.name === name);

    if (!rule) {
        console.error(`Rule "${name}" not found`);

        process.exit(1);
    }

    console.log(`
Rule: ${rule.name}

Category:
${rule.category}

Default Severity:
${rule.severity}

Description:
${rule.description}

Docs:
${rule.docs}
`);
}

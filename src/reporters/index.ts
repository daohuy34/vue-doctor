import { stylishReporter } from './stylish'
import { jsonReporter } from './json'
import { githubReporter } from './github'
import { generateSarifReport } from './sarif'
import { generateHtmlReport } from './html'

export type ReporterName = 'stylish' | 'json' | 'github' | 'sarif' | 'html';

export interface Reporter {
    name: ReporterName;
    report(result: any): string | void;
}

const htmlReporter: Reporter = {
    name: 'html',
    report(result) {
        return generateHtmlReport(result);
    },
};

const sarifReporter: Reporter = {
    name: 'sarif',
    report(result) {
        return generateSarifReport(result);
    },
};

export const reporters: Record<ReporterName, Reporter> = {
    stylish: stylishReporter as Reporter,
    json: jsonReporter as Reporter,
    github: githubReporter as Reporter,
    html: htmlReporter,
    sarif: sarifReporter,
};

export { generateHtmlReport } from './html'
export { generateSarifReport } from './sarif'
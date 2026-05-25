import * as babelTraverse from '@babel/traverse';

const traverse =
    typeof babelTraverse === 'function'
        ? babelTraverse
        : (babelTraverse as any).default ?? babelTraverse;

export { traverse };

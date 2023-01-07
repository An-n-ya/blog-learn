import { describe, it, expect } from 'vitest';
import {importMarkdowns} from '$lib/handle-markdown'

describe('markdown test', () => {
	it('importMarkdowns', () => {
		let posts = importMarkdowns('src/posts/');
		console.log(posts);
		expect(1 + 2).toBe(3);
	});
});


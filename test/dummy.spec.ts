import * as assert from 'assert';


describe('Dummy tests', function () {

	for (const i of [1,2]) {
		it(`should work if ${i} == 2`, function() {
			assert(i == 2);
		});
	}

	it('should only work in the container', function() {
		debugger;
		assert.equal(process.env.WHERE_AM_I, "container");
	});

	it('should only work in the host', function() {
		assert.equal(process.env.WHERE_AM_I, "host");
	});

});

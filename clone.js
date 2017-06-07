//オブジェクトをディープコピーするための関数;
//第一引数はコピーさせたいオブジェクトを渡す;
//第二引数はオブジェクトをどの程度同質にするかをオブジェクトで指定;
//例えば{descriptor: false, extensible: false}と指定すると
//ディスクリプタはコピー元のオブジェクトと同じにならない(全てtrueになる)、
//そして、オブジェクトの拡張可属性(frozen,sealedなど)は同じにならず、全て拡張可になる;
//指定しなければ全てコピー元のオブジェクトと同じになる;
//第三引数はコピーさせたくない型(親のprototype)を配列で渡す;
//第四引数はコピーさせたくないオブジェクトを配列で渡す;

//使い方;
//clone(object, homogeneity, excludedPrototypes, excludedObjects);
var clone = (function() {
	//引数の型を返す関数;
	var typeOf = function(operand) {
		return Object.prototype.toString.call(operand).slice(8, -1);
	};

	//引数がプリミティブかオブジェクトか判定;
	var isPrimitive = function(type) {
		if(type === null) {
			return true;
		}
		if(typeof type === 'object' || typeof type === 'function') {
			return false;
		}
		return true;
	};

	//アクセサプロパティかデータプロパティか判定;
	var isAccessorDescriptor = function(descriptor) {
		return 'get' in descriptor;
	};

	//descriptorを同じにせず、get,set,value以外のdescriptor全てtrueのプロパティを定義;
	var defineProperty = function(cloneObject, propName, descriptor, cloneParams) {
		//cloneの引数が多すぎるのでbindする;
		var boundClone = function(object) {
			return clone(object, cloneParams.homogeneity, cloneParams.excludedPrototypes, cloneParams.excludedObjects, cloneParams.memo);
		};

		if(isAccessorDescriptor(descriptor)) {
			//アクセサプロパティの場合;
			Object.defineProperty(cloneObject, propName, {
				get: boundClone(descriptor.get),
				set: boundClone(descriptor.set),
				enumerable: true,
				configurable: true,
			});
		}else {
			//データプロパティの場合;
			Object.defineProperty(cloneObject, propName, {
				value: boundClone(descriptor.value),
				enumerable: true,
				configurable: true,
				writable: true,
			});
		}
		return cloneObject;
	};

	//descriptorが同じプロパティを定義する;
	var equalizeDescriptor = function(cloneObject, propName, descriptor, cloneParams) {
		//cloneの引数が多すぎるのでbindする;
		var boundClone = function(object) {
			return clone(object, cloneParams.homogeneity, cloneParams.excludedPrototypes, cloneParams.excludedObjects, cloneParams.memo);
		};

		if(isAccessorDescriptor(descriptor)) {
			//アクセサプロパティの場合;
			Object.defineProperty(cloneObject, propName, {
				get: boundClone(descriptor.get),
				set: boundClone(descriptor.set),
				enumerable: descriptor.enumerable,
				configurable: descriptor.configurable,
			});
		}else {
			//データプロパティの場合;
			Object.defineProperty(cloneObject, propName, {
				value: boundClone(descriptor.value),
				enumerable: descriptor.enumerable,
				configurable: descriptor.configurable,
				writable: descriptor.writable,
			});
		}
		return cloneObject;
	};

	//objectの拡張可属性を同じにする;
	var equalizeExtensible = function(object, cloneObject) {
		if(Object.isFrozen(object)) {
			Object.freeze(cloneObject);
			return;
		}
		if(Object.isSealed(object)) {
			Object.seal(cloneObject);
			return;
		}
		if(Object.isExtensible(object) === false) {
			Object.preventExtensions(cloneObject);
			return
		}
	};

	//型を作成するオブジェクト;
	var sameTypeCreater = {
		//引数のobjectの型と同一の型を返すメソッド;
		create: function(object) {
			var type = typeOf(object);
			var method = this[type];

			//ここで列挙されていない型は対応していないので、nullを返す;
			if(method === undefined) {
				return null;
			}
			return this[type](object);
		},
		Object: function(object) {
			//自作クラスはprototype継承される
			return Object.create(Object.getPrototypeOf(object));
		},
		Array: function(object) {
			return new Array();
		},
		Function: function(object) {
			//ネイティブ関数オブジェクトはcloneできないのでnullを返す;
			try {
				var anonymous;
				eval('anonymous = ' + object.toString());
				return anonymous;
			}catch(e) {
				return null;
			}
		},
		Error: function(object) {
			new Object.getPrototypeOf(object).constructor();
		},
		Date: function(object) {
			new Date(object.valueOf());
		},
		RegExp: function(object) {
			new RegExp(object.valueOf());
		},
		Boolean: function(object) {
			new Boolean(object.valueOf());
		},
		String: function(object) {
			new String(object.valueOf());
		},
		Number: function(object) {
			new Number(object.valueOf());
		},
	};

	//memoオブジェクトを作る関数;
	//一度コピーされたオブジェクトはmemoオブジェクトに保存され;
	//二度コピーすることがないようにする(循環参照対策);
	var createMemo = function() {
		var memo = new Object();
		var types = ['Object', 'Array', 'Function', 'Error', 'Date', 'RegExp', 'Boolean', 'String', 'Number'];
		types.forEach(function(type) {
			memo[type] = {
				objects: [],
				cloneObjects: []
			};
		});
		return memo;
	};

	//実際に呼ばれる関数;
	//objectのプロパティを再帰的にコピーし、cloneObjectを返す;
	function clone(object, homogeneity, excludedPrototypes, excludedObjects, memo) {
		//プリミティブ型はそのまま返す;
		if(isPrimitive(object)) {
			return object;
		}
		//cloneしたくない型を持つobjectであれば、参照で返す;
		if(excludedPrototypes.indexOf(Object.getPrototypeOf(object)) !== -1) {
			return object;
		}
		//cloneしたくないobjectであれば、参照で返す;
		if(excludedObjects.indexOf(object) !== -1) {
			return object;
		}

		//objectと同一の型を持つcloneObjectを作成する;
		var cloneObject =  sameTypeCreater.create(object);
		//cloneObjectがnullなら対応していないので参照で返す;
		if(cloneObject === null) {
			return object;
		}

		//循環参照対策 objectが既にmemoに保存されていれば内部参照なので、値渡しではなくcloneObjectに参照先を切り替えたobjectを返す;
		var type = typeOf(object);
		var index = memo[type]['objects'].indexOf(object);
		if(index !== -1) {
			return memo[type]['cloneObjects'][index];
		}

		//循環参照対策 objectはcloneObjectとセットでmemoに追加;
		memo[type]['objects'].push(object);
		memo[type]['cloneObjects'].push(cloneObject);


		var propNames = Object.getOwnPropertyNames(object);
		var cloneParams = {
			homogeneity: homogeneity,
			excludedPrototypes: excludedPrototypes,
			excludedObjects: excludedObjects,
			memo: memo,
		};
		//objectのすべてのプロパティを再帰的にcloneして、cloneObjectのプロパティに加える;
		propNames.forEach(function(propName) {
			var descriptor = Object.getOwnPropertyDescriptor(object, propName);

			if(propName in cloneObject) {
				//オブジェクト生成時に自動的に定義されるネイティブプロパティ(lengthなど)なら
				//ディスクリプタも同一にしてプロパティの内容をクローンする;
				equalizeDescriptor(cloneObject, propName, descriptor, cloneParams);
				return;
			}

			//descriptorを全く同じにするか;
			if(homogeneity.descriptor === false) {
				//同じにしないならプロパティの内容だけクローンする;
				defineProperty(cloneObject, propName, descriptor, cloneParams);
			}else {
				//ディスクリプタも同一にしてプロパティの内容をクローンする;
				equalizeDescriptor(cloneObject, propName, descriptor, cloneParams);
			}
		});

		//objectの拡張可属性(preventExtensible, isSealed, isFrozen)を同一にするか;
		if(homogeneity.extensible !== false) {
			equalizeExtensible(object, cloneObject);
		}

		//クローンしたオブジェクトを返す;
		return cloneObject;
	}

	return function(object, homogeneity, excludedPrototypes, excludedObjects) {
		if(homogeneity === null || typeof homogeneity !== 'object') {
			homogeneity = {};
		}
		if(! Array.isArray(excludedPrototypes)) {
			excludedPrototypes = [];
		}
		if(! Array.isArray(excludedObjects)) {
			excludedObjects = [];
		}
		return clone(object, homogeneity, excludedPrototypes, excludedObjects, createMemo());
	};
})();

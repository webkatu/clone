var clone = (function() {
	var typeOf = function(operand) {
		return Object.prototype.toString.call(operand).slice(8, -1);
	};

	var isPrimitive = function(type) {
		if(type === null) {
			return true;
		}
		if(typeof type === 'object' || typeof type === 'function') {
			return false;
		}
		return true;
	};

	var isAccessorDescriptor = function(descriptor) {
		return 'get' in descriptor;
	};

	var cloneNode = (function() {

		var cloneScript = function(element) {
			var script = document.createElement('script');
			var attrs = element.attributes;
			for(var i = 0, len = attrs.length; i < len; i++) {
				var attr = attrs[i];
				script.setAttribute(attr.name, attr.value);
			}
			script.innerHTML = element.innerHTML;
			return script;
		};

		var cloneNode = function(node) {
			//script要素は再評価するためにcloneScriptでcloneする;
			if(node.tagName === 'SCRIPT') {
				return cloneScript(node);
			}
			//cloneNodeで要素をcloneする;
			var clone = node.cloneNode();
			//子要素があれば再帰的に追加;
			if(node.firstChild) {
				var childNodes = node.childNodes;
				for(var i = 0, len = childNodes.length; i < len; i++) {
					clone.appendChild(cloneNode(childNodes[i]));
				}
			}
			return clone;
		};

		return cloneNode;
	})();

	var sameTypeCreater = {
		//objectの型と同一の型を返すメソッド;
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

	//第一引数はcloneしたいobject;
	//第二引数はcloneしたくないobjectのconstructorのprototypeを配列で指定する;
	//第三引数は循環参照対策のためのmemoオブジェクト;
	function clone(object, prototypes, memo) {
		//プリミティブ型はそのまま返す;
		if(isPrimitive(object)) {
			return object;
		}
		//cloneしたくないobjectであれば、参照で返す;
		if(prototypes.indexOf(Object.getPrototypeOf(object)) !== -1) {
			return object;
		}
		//Nodeオブジェクトは自作関数cloneNodeに処理を任せる;
		if(object instanceof Node){
			return cloneNode(object);
		}

		//objectの型とcloneObjectの型を同一にする;
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

		//objectのすべてのプロパティを再帰的にcloneする;
		//ディスクリプタも同一にする;
		var properties = Object.getOwnPropertyNames(object);
		properties.forEach(function(prop) {
			var descriptor = Object.getOwnPropertyDescriptor(object, prop);
			if(isAccessorDescriptor(descriptor)) {
				//アクセサプロパティ;
				Object.defineProperty(cloneObject, prop, {
					get: clone(descriptor.get, prototypes, memo),
					set: clone(descriptor.set, prototypes, memo),
					enumerable: descriptor.enumerable,
					configurable: descriptor.configurable,
				});
			}else {
				//データプロパティ;
				Object.defineProperty(cloneObject, prop, {
					value: clone(descriptor.value, prototypes, memo),
					enumerable: descriptor.enumerable,
					configurable: descriptor.configurable,
					writable: descriptor.writable,
				});
			}
			cloneObject[prop] = clone(object[prop], prototypes, memo);
		});

		//cloneしたオブジェクトを返す;
		return cloneObject;
	}

	return function(object, prototypes) {
		if(! Array.isArray(prototypes)) {
			prototypes = [];
		}
		return clone(object, prototypes, createMemo());
	}
})();
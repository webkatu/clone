var clone = (function() {
	//循環参照対策のため、すべてオブジェクトをmemoに保存;
	var memo = [];
	//main関数 第一引数はcloneしたいobject 第二引数はcloneしたくないobjectのconstructorを配列で指定する;
	function clone(object, constructors) {
		//cloneしたくないobjectであれば、参照で返す;
		if(typeOf(constructors) === 'Array'){
			for(var i = 0, len = constructors.length; i < len; i++) {
				if(object.constructor === constructors[i]) {
					return object;
				}
			}
		}
		//プリミティブ型はそのまま返す;
		if(typeof object !== 'object' && typeof object !== 'function') {
			return object;
		}
		//nodeは自作関数cloneNodeに処理を任せる;
		if(object instanceof Node){
			return cloneNode(object);
		}
		//objectの型とcloneObjの型を同一にする;
		var cloneObj;
		switch(typeOf(object)) {
			case 'Object':
				cloneObj = {};
				break;
			case 'Array':
				cloneObj = [];
				break;
			case 'Function':
				//ネイティブ関数オブジェクトはcloneできないので、そのまま参照で返す;
				try {
					eval("cloneObj = " + object.toString());
				}catch(e) {
					return object;
				}
				break;
			case 'Date':
				cloneObj = new Date(object);
				break;
			case 'RegExp':
				cloneObj = new RegExp(object);
				break;
			case 'Boolean':
			case 'String':
			case 'Number':
				cloneObj = new Object(object.valueOf());
				break;
			default:
				//ここで列挙されていない型は対応していないので、参照で返す;
				return object;
		}
		//循環参照対策 objectが既にmemoに保存されていれば内部参照なので、値渡しではなくcloneObjに参照先を切り替えたobjectを返す;
		for(var i = 0, len = memo.length; i < len; i++) {
			if(memo[i][0] === object) {
				return memo[i][1];
			}
		}
		//循環参照対策 objectはcloneObjとセットでmemoに追加;
		memo[memo.length] = [object, cloneObj];
		//objectのすべてのプロパティを再帰的にcloneする;
		for(var prop in object) {
			cloneObj[prop] = clone(object[prop], constructor);
		}
		//cloneしたオブジェクトを返す;
		return cloneObj;
	}
	function typeOf(operand) {
		return Object.prototype.toString.call(operand).slice(8, -1);
	}
	function cloneNode(node) {
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
	}
	function cloneScript(element) {
		var script = document.createElement('script');
		var attrs = element.attributes;
		for(var i = 0, len = attrs.length; i < len; i++) {
			var attr = attrs[i];
			script.setAttribute(attr.name, attr.value);
		}
		script.innerHTML = element.innerHTML;
		return script;
	}

	return function(object, constructors) {
		memo = [];
		return clone(object, constructors);
	}
})();
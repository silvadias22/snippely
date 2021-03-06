Snippely.Snippets = {

	initialize: function(){
		this.list = $('snippets-list');
		this.container = $('content-wrap');
		this.id = ART.retrieve('snippet:active') || 0;
		this.buildMenus();
		
		$('snippets').addEvents({
			mousedown: this.deselect.bind(this),
			contextmenu: this.showMenu.bind(this)
		});
	},
	
	load: function(insert){
		var focus = insert && insert.lastInsertRowID;
		var callback = function(result){
			var snippets = result.data || [];
			this.build(snippets, focus);
		}.bind(this);
		
		Snippely.database.execute(this.Queries.select, callback, { group_id: Snippely.Groups.id });
	},
	
	build: function(snippets, focus){
		this.list.empty();
		this.elements = $$(snippets.map(this.create, this));
		this.select($('snippet_' + (focus || this.id)), focus);
		this.redraw();
	},
	
	create: function(snippet){
		var element = new Element('li', {
			id: 'snippet_' + snippet.id,
			text: snippet.title
		}).store('snippet:id', snippet.id);
		
		element.addEvent('mousedown', function(event){
			event.stopPropagation();
			this.select(element);
			
			var clone = new Element('div', {
				'class': 'clone',
				'text': element.get('text'),
				'styles': element.getStyles('left', 'width')
			}).inject(document.body).position(element.getPosition());
			
			var cancel = function(){
				clone.destroy();
				if (element) element.setStyle('visibility', 'visible');
			};
			
			new Drag.Move(clone, {
				droppables: Snippely.Groups.elements,
				onStart: function(){
					clone.setStyle('visibility', 'visible');
					element.setStyle('visibility', 'hidden');
				},
				onEnter: function(draggable, droppable){
					if (droppable.hasClass('selected')) return;
					droppable.addClass('hovering');
				},
				onLeave: function(draggable, droppable){
					droppable.removeClass('hovering');
				},
				onDrop: function(draggable, droppable){
					if (!droppable || droppable.hasClass('selected')) return;
					var id = snippet.id, group_id = droppable.retrieve('group:id');
					var callback = function(){
						element.destroy();
						droppable.removeClass('hovering');
						this.redraw();
					}.bind(this);
					Snippely.database.execute(this.Queries.updateGroup, callback, { id: id, group_id: group_id });
				}.bind(this),
				onCancel: cancel,
				onComplete: cancel
			}).start(event);
		}.bind(this));
		
		new Snippely.Editable(element, { onBlur: this.update.bind(this) });
		
		return element.inject(this.list);
	},
	
	add: function(){
		Snippely.database.execute(this.Queries.insert, this.load.bind(this), { group_id: Snippely.Groups.id });
	},
	
	update: function(element){
		Snippely.database.execute(this.Queries.update, this.load.bind(this), {
			id: element.retrieve('snippet:id'),
			title: element.get('text')
		});
	},
	
	select: function(element, focus){
		if (!element || element == this.selected) return;
		this.elements.removeClass('selected');
		this.selected = element.addClass('selected');
		this.id = element.retrieve('snippet:id');
		Snippely.Snippet.load(this.id);
		Snippely.Snips.load(this.id);
		Snippely.toggleMenus('Snippet', true);
		if (focus) element.fireEvent('dblclick');
	},
	
	deselect: function(){
		if (!this.selected) return;
		if (this.selected.retrieve('editable').editing()) this.selected.blur();
		else {
			this.elements.removeClass('selected');
			this.selected = this.id = null;
			Snippely.Snippet.hide();
			Snippely.toggleMenus('Snippet', false);
		}
	},
	
	rename: function(){
		if (!this.selected) return;
		this.selected.fireEvent.delay(100, this.selected, 'dblclick');
	},
	
	remove: function(){
		if (!this.selected || !confirm("Are you sure you want to remove this Snippet?")) return;
		this.removeById(this.selected.retrieve('snippet:id'));
		this.selected.destroy();
		this.deselect();
		this.redraw();
	},
	
	removeById: function(id){
		Snippely.database.execute(this.Queries.remove, { id: id });
		Snippely.Snips.removeBySnippet(id);
	},
	
	removeByGroup: function(group_id){
		var callback = function(result){
			if (result.data) $each(result.data, function(snippet){
				Snippely.Snips.removeBySnippet(snippet.id);
			}, this);
			
			Snippely.database.execute(this.Queries.removeByGroup, { group_id: group_id });
		}.bind(this);
		
		Snippely.database.execute(this.Queries.select, callback, { group_id: group_id });
	},
	
	show: function(){
		this.container.setStyle('display', '');
	},
	
	hide: function(){
		this.container.setStyle('display', 'none');
	},
	
	redraw: function(){
		this.elements.removeClass('odd');
		this.list.getElements(':odd').addClass('odd');
		Snippely.Snippet.hide();
		this.show();
		Snippely.redraw();
	},
	
	buildMenus: function(){
		this.addMenu = new ART.Menu('SnippetAddMenu').addItem(
			new ART.Menu.Item('Add Snippet...', {
				onSelect: this.add.bind(this)
			})
		);
		this.actionMenu = new ART.Menu('SnippetActionMenu').addItems(
			new ART.Menu.Item('Rename Snippet...', {
				onSelect: this.rename.bind(this)
			}),
			new ART.Menu.Item('Remove Snippet...', {
				onSelect: this.remove.bind(this)
			})
		);
	},
	
	showMenu: function(event){
		this[(event.target.get('tag') == 'li') ? 'actionMenu' : 'addMenu'].display(event.client);
	}
	
};

//Snippets list related queries

Snippely.Snippets.Queries = {
	
	select: "SELECT id, title FROM snippets WHERE group_id = :group_id ORDER BY UPPER(title) ASC",
	
	insert: "INSERT INTO snippets (group_id, title, description) VALUES (:group_id, 'New Snippet', 'Description')",
	
	remove: "DELETE FROM snippets WHERE id = :id",
	
	update: "UPDATE snippets SET title = :title WHERE id = :id",
	
	updateGroup: 'UPDATE snippets SET group_id = :group_id WHERE id = :id',
	
	removeByGroup: "DELETE FROM snippets WHERE group_id = :group_id"
	
};
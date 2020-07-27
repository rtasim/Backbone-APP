// Load the application once the DOM is ready, using `jQuery.ready`:
$(function () {
    // Topic Model
    var Topic = Backbone.Model.extend({

        // Default attributes for the topic item.
        defaults: function () {
            return {
                title: "",
                description: "",
                order: Topics.nextOrder(),
                done: false
            };
        },
        // Toggle the `done` state of this topic item.
        toggle: function () {
            this.save({done: !this.get("done")});
        }

    });

    // Topic Collection
    // ---------------

    // The collection of topics is backed by *localStorage* instead of a remote
    // server.
    var TopicList = Backbone.Collection.extend({

        // Reference to this collection's model.
        model: Topic,

        // Save all of the topic items under the `"topics-backbone"` namespace.
        localStorage: new Backbone.LocalStorage("topics-backbone"),

        // Filter down the list of all topic items that are finished.
        done: function () {
            return this.where({done: true});
        },

        // Filter down the list to only topic items that are still not finished.
        remaining: function () {
            return this.where({done: false});
        },

        // We keep the Topics in sequential order, despite being saved by unordered
        // GUID in the database. This generates the next order number for new items.
        nextOrder: function () {
            if (!this.length) return 1;
            return this.last().get('order') + 1;
        },

        // Topics are sorted by their original insertion order.
        comparator: 'order'

    });

    // Create our global collection of **Topics**.
    var Topics = new TopicList;

    // Topic Item View
    // --------------

    // The DOM element for a topic item...
    var TopicView = Backbone.View.extend({

        //... is a list tag.
        tagName: "li",

        // Cache the template function for a single item.
        template: _.template($('#item-template').html()),
        EditTemplate: _.template($('#item-template-edit').html()),

        // The DOM events specific to an item.
        events: {
            "click .toggle": "toggleDone",
            "click .edit-topic": "topicInfoSave",
            "click a.destroy": "clear",
            "click a.topic-name": "editTheTopic",
        },

        // The TopicView listens for changes to its model, re-rendering. Since there's
        // a one-to-one correspondence between a **Topic** and a **TopicView** in this
        // app, we set a direct reference on the model for convenience.
        initialize: function () {
            this.listenTo(this.model, 'change', this.render);
            this.listenTo(this.model, 'destroy', this.remove);
            this.topicForm = $('#create-topic-form');
        },

        // Re-render the titles of the topic item.
        render: function () {
            this.$el.html(this.template(this.model.toJSON()));
            return this;
        },

        // Toggle the `"done"` state of the model.
        toggleDone: function () {
            this.model.toggle();
        },

        topicInfoSave: function () {
            var title = $("#update-topic-title").val();
            var desc = $("#update-topic-description").val();
            this.model.save({title: title, description: desc});
        },

        // Switch this view into `"editing"` mode, displaying the input field.
        edit: function () {
            this.$el.addClass("editing");
            this.title.focus();
        },

        editTheTopic: function () {
            this.topicForm.html('');
            this.topicForm.show();
            this.topicForm.html(this.EditTemplate(this.model.toJSON()));
            this.setElement(this.topicForm);
        },


        // Close the `"editing"` mode, saving changes to the topic.
        close: function () {
            var value = this.title.val();
            if (!value) {
                this.clear();
            } else {
                this.model.save({title: value});
                this.$el.removeClass("editing");
            }
        },


        // If you hit `enter`, we're through editing the item.
        updateOnEnter: function (e) {
            // if (e.keyCode == 13) this.close();
        },

        // Remove the item, destroy the model.
        clear: function () {
            this.model.destroy();
        }

    });

    // The Application
    // ---------------

    // Our overall **AppView** is the top-level piece of UI.
    var AppView = Backbone.View.extend({

        // Instead of generating a new element, bind to the existing skeleton of
        // the App already present in the HTML.
        el: $("#topicapp"),

        // Our template for the line of statistics at the bottom of the app.
        statsTemplate: _.template($('#stats-template').html()),
        createTopicTemplate: _.template($('#item-template-create').html()),

        // Delegated events for creating new items, and clearing completed ones.
        events: {
            "click #create-topic": "showCreateTopic",
            "click #save-topic": "createOnEnter",
            "click #clear-completed": "clearCompleted",
            "click #toggle-all": "toggleAllComplete",
            // "click a.edit-topic": "topicInfoSave",
        },

        // At initialization we bind to the relevant events on the `Topics`
        // collection, when items are added or changed. Kick things off by
        // loading any preexisting topics that might be saved in *localStorage*.
        initialize: function () {

            this.title = this.$("#new-topic");
            this.description = this.$("#new-topic-description");
            this.allCheckbox = this.$("#toggle-all")[0];

            this.listenTo(Topics, 'add', this.addOne);
            this.listenTo(Topics, 'reset', this.addAll);
            this.listenTo(Topics, 'all', this.render);

            this.footer = this.$('footer');
            this.main = $('#main');
            this.container = $('#container');
            this.topicForm = $('#create-topic-form');

            Topics.fetch();
        },

        // Re-rendering the App just means refreshing the statistics -- the rest
        // of the app doesn't change.
        render: function () {
            var done = Topics.done().length;
            var remaining = Topics.remaining().length;

            if (Topics.length) {
                this.main.show();
                this.footer.show();
                this.footer.html(this.statsTemplate({done: done, remaining: remaining}));
            } else {
                this.main.show();
                this.footer.show();
            }

            this.allCheckbox.checked = !remaining;
        },

        // Add a single topic item to the list by creating a view for it, and
        // appending its element to the `<ul>`.
        addOne: function (topic) {
            var view = new TopicView({model: topic});
            this.$("#topics-list").append(view.render().el);
        },

        // Add all items in the **Topics** collection at once.
        addAll: function () {
            Topics.each(this.addOne, this);
        },

        // If you hit return in the main input field, create new **Topic** model,
        // persisting it to *localStorage*.
        showCreateTopic: function (e) {
            this.topicForm.show();
            this.topicForm.html('');
            this.topicForm.html(this.createTopicTemplate);
        },

        createOnEnter: function (e) {
            debugger;
            if (!$("#new-topic").val()) return;
            // if (!this.title.val()) return;

            Topics.create({title: $("#new-topic").val(), description: $("#new-topic-description").val()});
            // Topics.create({title: this.title.val(), description: this.description.val()});
            this.title.val('');
            this.description.val('');
        },
        // Clear all done topic items, destroying their models.
        clearCompleted: function () {
            _.invoke(Topics.done(), 'destroy');
            return false;
        },

        toggleAllComplete: function () {
            var done = this.allCheckbox.checked;
            Topics.each(function (topic) {
                topic.save({'done': done});
            });
        }

    });

    // Finally, we kick things off by creating the **App**.
    var App = new AppView;

});

# UI Refactor

This is an experiment around three default Nuxeo pages:
- a folderish document summary page
- a document edit tab
- the search main tab

These pages have been saved on a Nuxeo 7.3-SNAPSHOT version, with UI
dev mode enabled, so that the HTML content can be tweaked to show
possible evolutions to thse configurations.


## About the current structure

There are only few changes to the originally saved HTML:
- links have been disabled
- select2 widgets were showing the suggestion box, these have been manually fixed
- the dev container content has been changed for the purpose of this doc.

It is important to note that the dev mode is changing the DOM content
a lot (adding a lot of content, actually, that's why the page is quite
heavy).

However, looking at this source (and related dependencies), it is
interesting to see that the way we currently handle CSS and JS
resources is not that clean (a lot of inline resources, that should be
moved to the head, and merged with other resources when possible).


## About the visible dev containers

There were a few additions to the originally visible slots for the following reasons:
- the current UI dev mode does not show "container" elements like
  layouts, because it is difficult to make them visible in the
  page. This has been changed (adding a new visible anchor so that the
  demonstration is more complete)
- some current UI elements are not served by layouts/widgets (the
  theme page and theme page fragements, for instance), this has been
  added because the goal is to make them serve by the layouts/widgets
  system


## About the target metamodel

Here is a presentation about the new UI metamodel presented by this
demo. Please play with the demo before reading this.

Names currently used (layouts, widgets, actions etc...) are
voluntarily not used to avoid mixing concepts, except when their
current features already match their future usage (filters, for
instance).

    <test>
      <yo>
      </yo>
    </test>


Blah
# UI Refactor

This is an experiment around three default Nuxeo pages:
- a folderish document summary page
- a document edit tab
- the search main tab

These pages have been saved on a Nuxeo 7.3-SNAPSHOT version, with UI
dev mode enabled, so that the HTML content can be tweaked to show
possible evolutions to these configurations.

## How to view the pages

Checkout the nuxeo-webcomponents project, and open each of the HTML files from this
folder in a browser.


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

There were a few additions to the originally visible slots for the
following reasons:
- the current UI dev mode does not show "container" elements like
  layouts, because it is difficult to make them visible in the
  page. This has been changed (adding a new visible anchor so that the
  demonstration is more complete)
- some current UI elements are not served by layouts/widgets (the
  theme page and theme page fragments, for instance), this has been
  added because the goal is to make them serve by the layouts/widgets
  system


## About the target metamodel

Here is a presentation about the new UI metamodel presented by this
demo. Please play with the demo before reading this.

Names currently used (layouts, widgets, actions etc...) are sometimes
voluntarily not used to avoid mixing concepts, except when their
current features already match their future usage (filters, for
instance).


### Typed UI elements, for a given category

Let's use the term "UI element", or just "element" for the page and
its fragments.

Each of these elements is registered to the Nuxeo service using a
standard extension point. They can mention one or more categories, so
that they do not conflict with elements that would be designed for a
different target UI technology.

    <element name="document_management" category="jsf"
      type="page" typeCategory="jsf">
      ...
    </element>

This declaration assumes there is a "page" type, already registered on
the "jsf" category (see next chapter for details about types):

    <element-type name="page" category="jsf">
      ...
    </element>

If useful, type category could be derived from element category to
make registration less verbose:

    <element name="document_management" type="page" category="jsf">
      ...
    </element>

If useful, multiple categories could be registered (using a sub-tag or
accepting comma-separated values on the "category" attribute).

Let's give other examples.

Document edit form:

    <element name="note_layout" category="jsf" type="form_layout">
      ...
    </element>

Document form, title element:

    <element name="title" category="jsf" type="text">
      ...
    </element>

Document listing, title element:

    <element name="listing_title" category="jsf" type="title_with_link">
      ...
    </element>

Document tab link, edit tab element:

    <element name="tab_doc_edit" category="jsf" type="rest_document_link">
      ...
    </element>


### Element types

The typology of builtin elements is registered similarly through
runtime extension points:

    <element-type name="page" category="jsf">
      ...
    </element>

This registration is currently driven by the JSF implementation,
requiring a handler class, but could be adapted to refer to html pages
for web components, for instance.

Sample registration using a java class:

    <element-type name="text" category="jsf">
      ...
      <handler-class>
        org.nuxeo.ecm.platform.forms.layout.facelets.plugins.TextWidgetTypeHandler
      </handler-class>
    </element>

Sample registration using a xhtml template, with properties:

    <element-type name="list" category="jsf">
      ...
      <handler-class>
        org.nuxeo.ecm.platform.forms.layout.facelets.plugins.TemplateWidgetTypeHandler
      </handler-class>
      <property name="template">/widgets/js_list_widget_template.xhtml</property>
    </element>

Any number of properties can be used here, and the registration
currently requires the handler class to exist, but this could be
changed if needed.

A "configuration" element is also useful for Studio export (and
generation of configuration screens), it will need to be reviewed
depending on the target metamodel.

Sample based on current structure:

    <element-type name="list" category="jsf">
      <configuration>
        <title>List</title>
        <description>
          <p>
            The list widget displays an editable list of items in create or
            edit mode, with additional message tag for errors, and the same list
            of items in other modes. It is not usable within a list widget (see
            sublist widget for this feature).
          </p>
          <p>Items are defined using sub wigdets configuration.</p>
          <p>
            This is actually a template widget type whose template uses a
            &lt;nxu:inputList /&gt; tag in edit or create mode, and a table
            iterating over items in other modes.
          </p>
          <p>
            Since 5.6, it will apply to the current value (e.g. the layout or
            parent widget value) if no field definition is given.
          </p>
        </description>
        <demo id="listWidget" previewEnabled="false" />
        <categories>
          <category>document</category>
        </categories>
        <supportedModes>
          <mode>edit</mode>
          <mode>view</mode>
        </supportedModes>
        <acceptingSubWidgets>true</acceptingSubWidgets>
        <fields>
          <list>true</list>
          <complex>false</complex>
          <supportedTypes>
            <type>string</type>
            <type>path</type>
            <type>date</type>
            <type>blob</type>
            <type>integer</type>
            <type>double</type>
            <type>boolean</type>
            <type>complex</type>
          </supportedTypes>
          <defaultTypes>
            <type>string</type>
            <type>path</type>
            <type>date</type>
            <type>integer</type>
            <type>double</type>
            <type>boolean</type>
            <type>complex</type>
          </defaultTypes>
        </fields>
        <properties>
          <layouts mode="any">
            <layout name="list_widget_type_properties_any">
              <rows>
                <row>
                  <widget category="widgetTypeConf">list_subwidgets_display</widget>
                </row>
                <row>
                  <widget category="widgetTypeConf">subwidgets_hideSubLabels</widget>
                </row>
                <row>
                  <widget category="widgetTypeConf">styleClass</widget>
                </row>
              </rows>
            </layout>
          </layouts>
          <layouts mode="edit">
            <layout name="list_widget_type_properties_edit">
              <rows>
                <row>
                  <widget category="widgetTypeConf">required</widget>
                </row>
                <row>
                  <widget category="widgetTypeConf">list_diff</widget>
                </row>
                <row>
                  <widget category="widgetTypeConf">list_orderable</widget>
                </row>
                <row>
                  <widget category="widgetTypeConf">list_hideDeleteButton</widget>
                </row>
                <row>
                  <widget category="widgetTypeConf">list_hideAddButton</widget>
                </row>
                <row>
                  <widget category="widgetTypeConf">list_listTemplateItem</widget>
                </row>
                <row>
                  <widget category="widgetTypeConf">list_removeEmpty</widget>
                </row>
                <row>
                  <widget category="widgetTypeConf">list_number</widget>
                </row>
                <row>
                  <widget category="widgetTypeConf">list_addLabel</widget>
                </row>
              </rows>
            </layout>
          </layouts>
        </properties>
      </configuration>
      <handler-class>
        org.nuxeo.ecm.platform.forms.layout.facelets.plugins.ListWidgetTypeHandler
      </handler-class>
      <property name="template">/widgets/js_list_widget_template.xhtml</property>
      <property name="compatTemplate">/widgets/list_widget_template.xhtml</property>
    </element-type>

The "categories" and "fields" elements, in particular, will need to be
reviewed:
- the category here is confusing since there is already another notion
  of category. It represents a functional marker on the element type.
- the fields element assumes there is only one input field


### The "template" special type

In any case, users should be able to define their own logic for the
target type, using the "template" widget type in the target category.

In this case, the configuration is not explicit (there is no syntax to
document accepted properties, for instance).


### Other metadata common to all elements

Besides the type and category, there are other metadata common to all elements:

#### Label & Translation

All elements can have a label, and a notion of whether this label should be translated
or not:

    <element name="document_management" type="page" category="jsf">
      <label>label.document.management<label>
      <translated>true</translated>
      ...
    </element>

On a document form:

    <element name="title" category="jsf" type="text">
      <label>label.title<label>
      <translated>true</translated>
      ...
    </element>

#### Properties

Depending on properties supported by the given type,


- properties
- controls
- binding
- sub elements
- resources
- filters

### Mode management
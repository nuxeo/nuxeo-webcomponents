# UI Refactor

This is an experiment around three default Nuxeo pages:
- a folderish document summary page
- a document edit tab
- the search main tab

These pages have been saved on a Nuxeo 7.3-SNAPSHOT version, with UI
dev mode enabled, so that the HTML content can be tweaked to show
possible evolutions to these configurations.

## How to view the pages

Checkout the nuxeo-webcomponents project, and open each of the HTML files from
this folder in a browser.


## About the current structure

There are only few changes to the originally saved HTML:
- links have been disabled
- select2 widgets were showing the suggestion box, these have been manually
  fixed
- the dev container content has been changed for the purpose of this doc.

It is important to note that the dev mode is changing the DOM content
a lot (adding a lot of content, actually, that's why the page is quite
heavy).

However, looking at this source (and related dependencies), it is
interesting to see that the way we currently handle CSS and JS
resources is not very clean (a lot of inline resources, that should be
moved to the head, and merged with other resources when possible).


## About the visible dev containers

The dev containers that have been changed manually for this doc are made very
visible thanks to the "tooltip" icon and a label text in red.

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

All elements can have a label, and a notion of whether this label should be
translated or not:

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

Properties represent small variations in the element rendering:

    <element name="document_management" type="page" category="jsf">
      <properties>
        <property name="styleClass">mainPage</property>
      </properties>
      ...
    </element>

On a document form:

    <element name="title" category="jsf" type="text">
      <properties>
        <property name="styleClass">dataInput</property>
      </properties>
      ...
    </element>

Supported properties are declared on the corresponding element type, and accept
default values held by the element type configuration.

The properties can also accept expressions depending on the target rendering
technology:

    <element name="title" category="jsf" type="text">
      <properties mode="edit">
        <property name="required">#{not currentUser.administrator}</property>
      </properties>
      ...
    </element>

    <element name="title" category="jsf" type="text">
      <properties mode="edit">
        <property name="required">{{currentUserIsAdmin}}</property>
      </properties>
      ...
    </element>


#### Controls

Controls represent small variations in the element behavior.

The difference with properties can be subtle. In general, controls are like
properties that can be looked up by the parent element, to control behaviors
like:
- label rendering
- addition of a form around the widget
- style class on the element, applied by the parent element (grid style class,
  for instance)

    <element name="document_management" type="page" category="jsf">
      <controls>
        <control name="addForm">true</control>
      </controls>
      ...
    </element>

On a document form:

    <element name="title" category="jsf" type="text">
      <controls>
        <control name="addForm">true</control>
      </controls>
      ...
    </element>

Supported controls are declared on the corresponding element type, as well
as parent element type. They accept default values as held by the element
type(s) configurations (element type configuration wins over parent element
type configuration).

Similarly to properties, the controls can also accept expressions depending on
the target rendering technology.

#### Binding

Bindings represent the values that the widget will apply to.

When the corresponding value is read-only (cannot be edited thanks to the
element), it could be passed to the target element as a widget property, but
it's cleaner to consider these variables as "input context variables" and treat
them independently from properties when defining a widget type: these variables
will usually be derived from the context that the element applies to (see the
"About elements usage" section).

The easiest way to define a binding is to refer to the target field (when the
input parent element is bound to a document model:

    <element name="title" category="jsf" type="text">
      <bindings>
        <binding name="value">dc:title</control>
      </bindings>
      ...
    </element>

When no name is specified, and only one field is defined, the name "value" can
be omitted:

    <element name="title" category="jsf" type="text">
      <bindings>
        <binding>dc:title</control>
      </bindings>
      ...
    </element>

By default, the binding named "value" is "inherited" to sub elements (see
chapter about sub elements). A binding can be marked explicitely as inherited
like this:

    <element name="title" category="jsf" type="text">
      <bindings>
        <binding name="foo" inherit="true">dc:title</control>
      </bindings>
      ...
    </element>

Only one binding can be marked as inherited. When doing so, the "base binding"
for the sub element will be the resolved value of this binding.

The bindings can also accept expressions depending on the target rendering
technology:

    <element name="title" category="jsf" type="text">
      <bindings>
        <binding name="foo" inherit="true">#{mydoc.dc.title}</control>
      </bindings>
      ...
    </element>

    <element name="title" category="jsf" type="text">
      <bindings>
        <binding name="foo" inherit="true">{{task}}</control>
      </bindings>
      ...
    </element>


This binding notion replaces the "fields" notion on widgets, opening the
possibility to "named context variables" that are made available to the
elements context (instead of unnamed field variables field_0, field_1, etc...).
Bindings with no name will still depend on this naming for compatibility.


#### Sub Elements

Accepting sub elements is useful for UI composition.

In the current layout/widget system, the following configurations are possible:
- define a list of sub widgets
- define a list of sub widget references (to reuse global widgets)
- define rows/row/widgets or columns/column/widgets configurations, with
  accepted properties in the row or column configuration

Ideally, all these possibilities should be kept for the existing use cases,
but extended to all elements (which configuration would state how sub elements
can be declared and used).

The following configurations will then be available (only one configuration,
or several of them, depending on the element type):

    <element name="title" category="jsf" type="text">
      ...
      <subElements>
        <element name="subtitle" category="jsf" type="text">
          ...
        </element>
      </subElements>
    </element>

    <element name="title" category="jsf" type="text">
      ...
      <subElementRefs>
        <elementRef name="subtitle" category="jsf" />
      </subElements>
    </element>

    <element name="title" category="jsf" type="text">
      ...
      <rows>
        <row>
          <element>subtitle</element>
        </row>
      <rows>
      <element name="subtitle" ...>
        ...
      </element>
    </element>


Sometimes it can also be useful to group sub elements by name, the following
syntax is then allowed:

    <element name="title" category="jsf" type="text">
      ...
      <subElements group="header">
        <element name="subtitle" category="jsf" type="text">
          ...
        </element>
      </subElements>
      <subElements group="footer">
        <element name="details" category="jsf" type="text">
          ...
        </element>
      </subElements>
    </element>


#### Resources

Both an element and an element type can declare "web resources" that are
required for the element to be rendered correctly.

These resources are looked up and added to the page header on demand.

    <element name="title" category="jsf" type="foldableBox">
      ...
      <resources>
        <resource>jquery.js</resource>
        <resource>foldable-box.js</resource>
        <resource>foldable-box.css</resource>
      </resources>
    </element>

The named resources need to be declared on the "resources" extension point of
the runtime component "org.nuxeo.ecm.platform.WebResources".

Alternatively, resource bundles can be declared:

    <element name="document_management" type="page" category="jsf">
      ...
      <resourceBundles>
        <bundle>foldable_box</bundle>
      </resourceBundles>
    </element>

The same configuration can be held by the element type:

    <element-type name="page" category="jsf">
      ...
      <resourceBundles>
        <bundle>foldable_box</bundle>
      </resourceBundles>
    </element>


Warning: sometimes resources cannot be looked up dynamically, there are some
ajax use cases where the head tag will not be re-rendered on JSF current
behavior. In this case, the new element types should contribute to a "common"
bundle that is declared and used explicitly on all pages.


#### Filters

Filters can be attached to elements configuration to allow hiding some elements
depending on contextual use cases.

    <element name="title" category="jsf" type="text">
      ...
      <filters append="true">
        <filter-id>foo</resource>
        <filter-id>bar</resource>
      </filters>
      <filter name="foo">
        ...
      </filter>
    </element>

The filter definition is identical to the current filter definition in actions,
expect it can have access to additional context variables provided by elements
rendering logics (to be defined).

The potential "expression" conditions held by filter depend on the target
rendering technology (could be EL expressions, resolved server side, when using
the Seam/JSF UI).

Filters can be defined globally or locally (like elements), but when defined
locally, they are only accessible from this element configuration (similarly
to current local widgets definitions) -- this changes the behavior compared
to current action filters management.

Note that filters configuration replaces the pseudo mode "hidden" on widget
modes configuration (see section about "Mode management").


#### Incremental Elements

Some elements can be defined "globally" and inserted inside the rendering of
a page because of "place holder" elements referencing them.

Sample element:

    <element name="saveDocument" category="jsfAction" type="action">
      ...
      <flags>
        <flag name="foo" />
      </flags>
    </element>

The "foo" flag is a marker that makes it possible to lookup all elements using
the same flag:

    <element name="formActions" category="jsf" type="incremental">
      ...
      <properties>
        <property name="flag">foo</property>
      </properties>
    </element>

An additional "ordering" information can be added to the original element, to
control sorting of elements (fallbacks to an alphabetical ordering on the
element name):

    <element name="saveDocument" category="jsfAction" type="action">
      ...
      <flags>
        <flag name="foo" order="20" />
      </flags>
    </element>


### Mode management

Each of the following confs can be changed depending on the target mode, to
make it possible to share a given widget configuration in different use cases.

- labels
- properties
- controls

If needed, more configuration elements will be added to this list in the
future.

This allows the following alternative configurations in the case of properties
(controls accept a configuration similar to properties):

    <element name="title" category="jsf" type="text">
      <labels>
        <label mode="edit">The label in edit mode</label>
        <label mode="view">The label in view mode</label>
      </labels>
      ...
    </element>

    <element name="title" category="jsf" type="text">
      <properties mode="edit">
        <property name="styleClass">dataInput</property>
      </properties>
      ...
    </element>

The label without a mode is considered to be valid in any mode, which makes
the following configurations equivalent:

    <element name="title" category="jsf" type="text">
      <label>The label</label>
      ...
    </element>

    <element name="title" category="jsf" type="text">
      <labels>
        <label mode="any">The label</label>
      </labels>
      ...
    </element>

The properties without a mode are considered to be valid in any mode, which
makes the following configurations equivalent:

    <element name="title" category="jsf" type="text">
      <properties>
        <property name="styleClass">dataInput</property>
      </properties>
      ...
    </element>

    <element name="title" category="jsf" type="text">
      <properties mode="any">
        <property name="styleClass">dataInput</property>
      </properties>
      ...
    </element>

The attribute widgetMode on properties is deprecated: all properties depending
on a mode are now supposed to depend on the final widget mode.

The pseudo mode "hidden" is now deprecated: widgets that should be removed
from the rendering should be filtered using filters configuration instead.

The mode resolution now relies on the following logics: if target element type
defines a mode resolution logic, use it, otherwise fallback on an explicit
mode resolution logic specified in the element definition.

For instance, the current default resolution from a layout mode to a widget
mode will be available using a simple expression in the context, for instance:

    <element name="title" category="jsf" type="text">
      <widgetModes>
        <mode value="any">#{nxl:getWidgetModeFromLayoutMode(layoutMode)}</mode>
      </widgetModes>
      ...
    </element>

(of course, the function name and namespace can be changed according to new
namings)

A "readonly" element configuration would look like:

    <element name="title" category="jsf" type="text">
      <widgetModes>
        <mode value="edit">view</mode>
      </widgetModes>
      ...
    </element>


## About elements usage

### Specific tags to handle elements

The elements can be referred by name and type to be rendered on the target
technology.

Sample JSF example:

    <nx:element name="title" category="jsf" mode="edit" value="#{currentDocument}" />

Sample WebComponent example:

    <nx-element name="title" category="webc" mode="edit" value="{{doc}}"></nx-element>

Whenever the mode is not important, it should default to "view" instead of
being explicitly needed:

    <nx:element name="title" category="jsf" value="#{currentDocument}" />
    <nx-element name="title" category="webc" value="{{doc}}"></nx-element>

Since the "value" binding(s) can now be multiple, additional attributes can be
accepted by the tag(s):

    <nx:element name="title" category="jsf" mode="edit" value="#{currentDocument}"
      binding_foo="#{otherDoc}" />

The following declarations are equivalent:

    <nx:element name="title" category="jsf" mode="edit" value="#{currentDocument}" />
    <nx:element name="title" category="jsf" mode="edit" binding_value="#{currentDocument}" />

This will define or override the given binding(s) on the rendered element.

Similarly, properties and controls can be defined or overridden on the rendered
element:

    <nx:element name="title" category="jsf" mode="edit" value="#{currentDocument}"
      property_required="#{currentUser.administrator}" />

On WebComponents, an alternative syntax could be used:

    <nx-element name="title" category="webc" mode="edit"
      bindings="{'value': {{doc}}, foo: {{otherDoc}}"
      properties="{'required': {{elemrequired}}}">
    </nx-element>

Or for single binding use case:

    <nx-element name="title" category="webc" mode="edit"
      value="{{doc}}"
      properties="{'required': {{elemrequired}}}">
    </nx-element>

There are some use cases where the element could be built directly from the
rendering technology.

Sample JSF example:

    <nxl:widgetType name="textarea" category="jsf" mode="view"
      value="#{currentRoute.description}"
      styleClass="documentDescription quote" />

Sample WebComponent example:

    <nx-element-type name="title" category="webc" mode="view"
      value="{{currentRoute.description}}"
      properties="{'styleClass': 'documentDescription quote'">
    </nx-element-type>

In the case of webcomponents, additionnal tags can be defined to help working
with "builtin Nuxeo elements", for instance:

    <nx-form-layout name="dublincore" mode="edit" value="{{doc}}">
    </nx-form-layout>

This tag would implement the logics to retrieve the element named "dublincore"
in category "webc" and iterate over sub elements to provide the corresponding
rendering.

TODO: insert Nelson's POC use case here.


## TODO

There are already some use cases where layouts are retrieved from the document
type configuration => these configurations will have to be updated to refer to
elements instead.

- Define merging/override logics on elements and element types.
- Check validation/conversion use cases (?)
- check automation user actions integration (?)
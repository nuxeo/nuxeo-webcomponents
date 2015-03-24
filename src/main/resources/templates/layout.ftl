<link rel="import" href="../polymer/polymer.html">

<#list widgetTypes as widgetType>
<link rel="import" href="../widgets/${widgetType}.html">
</#list>

<polymer-element name="${tag}" attributes="mode value connectionId">
    <template>
        <nx-connection id="nx" connectionId="{{connectionId}}"></nx-connection>
        <#list layout.rows as row>
            <#list row.widgetReferences as widgetRef>
                <#assign widget = layout.getWidgetDefinition(widgetRef.name) />
                <#assign field =  widget.fieldDefinitions[0].propertyName />
                <${widget.type} value="{{value['${field}']}}"
                                mode="{{mode}}"
                                connectionId="{{connectionId}}">
                </${widget.type}>
            </#list>
         </#list>
    </template>
    <script>
        Polymer('${tag}', {
            /**
             * The id of a nx-connection to use.
             *
             * @attribute connectionId
             * @type string
             * @default ''
             */
            connectionId: '',

            /**
             * The value the layout will apply to.
             *
             * @attribute value
             * @type Object
             * @default 'null'
             */
            value: null,

            /**
             * The mode.
             *
             * @attribute mode
             * @type Object
             * @default 'view'
             */
            mode: 'view'
        });
    </script>
</polymer-element>
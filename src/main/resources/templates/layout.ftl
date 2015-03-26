<!--
(C) Copyright 2014 Nuxeo SA (http://nuxeo.com/) and contributors.

All rights reserved. This program and the accompanying materials
are made available under the terms of the GNU Lesser General Public License
(LGPL) version 2.1 which accompanies this distribution, and is available at
http://www.gnu.org/licenses/lgpl.html

This library is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
Lesser General Public License for more details.

Contributors:
  Nelson Silva <nelson.silva@inevo.pt>
-->

<!--
@group Nuxeo Layouts

`nx-datetime`

    <${tag} mode="view" value="{{doc}}"></${tag}>

@element ${tag}

@homepage http://www.nuxeo.org
-->

<link rel="import" href="../polymer/polymer.html">

<#list widgets as widget>
    <link rel="import" href="../widgets/<#if widget.global>${widget.name}<#else>${widget.type}</#if>.html">
</#list>


<polymer-element name="${tag}" attributes="mode value connectionId">
    <template>
        <#list layout.rows as row>
            <#list row.widgetReferences as widgetRef>
                <#assign widget = layout.getWidgetDefinition(widgetRef.name) />
                <#if widget.global>
                    <${widget.name} value="{{value}}" mode="{{mode}}" connectionId="{{connectionId}}"></${widget.name}>
                <#else>
                    <#assign field = widget.fieldDefinitions[0].propertyName />
                    <${widget.type} value="{{value['${field}']}}" mode="{{mode}}" connectionId="{{connectionId}}"></${widget.type}>
                </#if>

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
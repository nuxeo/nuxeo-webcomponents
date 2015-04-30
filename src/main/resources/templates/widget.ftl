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
-->

<!--
@group Nuxeo Widgets

`${tag}`

    <${tag} mode="view" value="{{doc}}"></${tag}>

@element ${tag}

@homepage http://www.nuxeo.org
-->

<link rel="import" href="../polymer/polymer.html">

<link rel="import" href="../widgets/${widget.type}.html">

<polymer-element name="${tag}" attributes="mode value connectionId" noscript>
    <template>
        <#assign value = "value" />
        <#if widget.fieldDefinitions >
            <#assign field = widget.fieldDefinitions[0].propertyName />
            <#assign value = "value.properties['${field}']" />
        </#if>
        <${widget.type} mode="{{mode}}" value="{{${value}}}" connectionId="{{connectionId}}"></${widget.type}>
    </template>
</polymer-element>
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

<#list entries as meta>
<x-meta id="${meta.id}" label="${meta.label}" group="${meta.group}">
    <template>
        <${meta.id}></${meta.id}>
    </template>

    <#list meta.properties?values as property>
        <property name="${property.name}"
                  kind="${property.kind}"
        <#list property.attributes?keys as att>
                  ${att}="${property.attributes[att]}"
        </#list>
                ></property>
    </#list>

    <template id="imports">
        <link rel="import" href="${importPath}/${meta.id}.html">
    </template>
</x-meta>
</#list>
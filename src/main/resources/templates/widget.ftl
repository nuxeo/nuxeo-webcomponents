
<link rel="import" href="../polymer/polymer.html">

<polymer-element name="${tag}" attributes="mode value connectionId">
<template>
    <nx-connection id="nx" connectionId="{{connectionId}}"></nx-connection>
    <#-- TODO -->
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
         * The value the widget will apply to.
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
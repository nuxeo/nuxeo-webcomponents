/*
 * (C) Copyright 2015 Nuxeo SA (http://nuxeo.com/) and contributors.
 *
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the GNU Lesser General Public License
 * (LGPL) version 2.1 which accompanies this distribution, and is available at
 * http://www.gnu.org/licenses/lgpl-2.1.html
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * Lesser General Public License for more details.
 *
 * Contributors:
 *      Nelson Silva <nsilva@nuxeo.com>
 */

package org.nuxeo.ecm.platform.webcomponents.metadata;

import com.google.common.base.CaseFormat;

import org.nuxeo.ecm.platform.forms.layout.api.LayoutDefinition;
import org.nuxeo.ecm.platform.forms.layout.api.WidgetDefinition;
import org.nuxeo.ecm.platform.forms.layout.api.WidgetTypeConfiguration;
import org.nuxeo.ecm.platform.forms.layout.api.WidgetTypeDefinition;
import org.nuxeo.ecm.platform.forms.layout.api.service.LayoutStore;
import org.nuxeo.runtime.api.Framework;

import java.util.HashMap;
import java.util.Map;

/**
 * Metadata for polymer web components.
 *
 * @since 7.3
 */
public class ElementMetadata {

    public static final String NUXEO_LAYOUTS_GROUP = "Nuxeo Layouts";

    public static final String NUXEO_WIDGETS_GROUP = "Nuxeo Widgets";

    public static final String NUXEO_WIDGET_TYPES_GROUP = "Nuxeo Widget Types";

    /** A unique id for the element */
    String id;

    /** The name to display */
    String label;

    /** The group the element belongs to */
    String group;

    /** Indicates if your element can contain other element */
    boolean isContainer;

    /** Metadata for the element's properties */
    Map<String, PropertyMetadata> properties = new HashMap<>();

    // TODO: get the available modes from the widget configuration
    private static final PropertyMetadata PROPERTY_MODE = PropertyMetadata.select("mode",
        new String[] { "view", "edit" });

    /**
     * Creates metadata from a WidgetDefinition
     */
    public static ElementMetadata from(WidgetDefinition widgetDef) {
        // start with the metadata of the widget type
        LayoutStore layoutStore = Framework.getService(LayoutStore.class);
        WidgetTypeDefinition widgetTypeDef = layoutStore.getWidgetTypeDefinition("webcomponents", widgetDef.getType());
        if (widgetTypeDef == null) {
            return null;
        }
        return ElementMetadata.from(widgetTypeDef)
        // and override with the widget's own meta
            .setId(widgetDef.getName())
            .setLabel(widgetDef.getName())
            .setGroup(NUXEO_WIDGETS_GROUP)
            .addProperty(PropertyMetadata.json("value")); // json value
    }

    /**
     * Creates metadata from a WidgetTypeDefinition
     */
    public static ElementMetadata from(WidgetTypeDefinition widgetTypeDef) {

        // default values for types without configuration
        String label = widgetTypeDef.getName();
        String group = NUXEO_WIDGET_TYPES_GROUP;
        boolean isContainer = false;

        WidgetTypeConfiguration configuration = widgetTypeDef.getConfiguration();
        if (configuration != null) {
            label = configuration.getTitle();
            String category = configuration.getCategories().get(0); // TODO: check the category to use
            category = CaseFormat.LOWER_HYPHEN.to(CaseFormat.UPPER_CAMEL, category);
            group = "Nuxeo " + category;
            isContainer = configuration.isAcceptingSubWidgets();
        }
        return new ElementMetadata()
            .setId(widgetTypeDef.getName())
            .setLabel(label)
            .setGroup(group)
            .isContainer(isContainer)
            .addProperty(PROPERTY_MODE)
            .addProperty(PropertyMetadata.string("value"));
    }

    /**
     * Creates metadata from a WidgetDefinition
     */
    public static ElementMetadata from(LayoutDefinition layoutDef) {
        return new ElementMetadata()
            .setId(layoutDef.getName())
            .setLabel(layoutDef.getName())
            .setGroup(NUXEO_LAYOUTS_GROUP)
            .addProperty(PROPERTY_MODE)
            .addProperty(PropertyMetadata.json("value")); // json value
    }

    /// Builders
    public ElementMetadata setId(String id) {
        this.id = id;
        return this;
    }

    public ElementMetadata setLabel(String label) {
        this.label = label;
        return this;
    }

    public ElementMetadata setGroup(String group) {
        this.group = group;
        return this;
    }

    public ElementMetadata isContainer(boolean isContainer) {
        this.isContainer = isContainer;
        return this;
    }

    public ElementMetadata addProperty(PropertyMetadata property) {
        this.properties.put(property.name, property);
        return this;
    }

    // Getters
    public String getId() {
        return id;
    }

    public String getLabel() {
        return label;
    }

    public String getGroup() {
        return group;
    }

    public boolean isContainer() {
        return isContainer;
    }

    public Map<String, PropertyMetadata> getProperties() {
        return properties;
    }
}

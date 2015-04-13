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

package org.nuxeo.ecm.platform.webcomponents.layout.converters;

import com.google.common.base.CaseFormat;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.nuxeo.ecm.platform.forms.layout.api.LayoutDefinition;
import org.nuxeo.ecm.platform.forms.layout.api.LayoutRowDefinition;
import org.nuxeo.ecm.platform.forms.layout.api.WidgetDefinition;
import org.nuxeo.ecm.platform.forms.layout.api.WidgetReference;
import org.nuxeo.ecm.platform.forms.layout.api.converters.LayoutConversionContext;
import org.nuxeo.ecm.platform.forms.layout.api.converters.LayoutDefinitionConverter;
import org.nuxeo.ecm.platform.forms.layout.api.converters.WidgetDefinitionConverter;
import org.nuxeo.ecm.platform.forms.layout.api.service.LayoutStore;
import org.nuxeo.runtime.api.Framework;

/**
 * Converter to allow reusing existing JSF layout/widget definitions as web components.
 *
 * @since 7.3
 */
public class JSFToWebComponentsConverter implements LayoutDefinitionConverter, WidgetDefinitionConverter {

    protected static final Log log = LogFactory.getLog(JSFToWebComponentsConverter.class);

    private static final String JSF_CATEGORY = "jsf";

    public static final String TAG_PREFIX = "nx";

    private LayoutStore layoutStore;

    @Override
    public LayoutDefinition getLayoutDefinition(LayoutDefinition orig, LayoutConversionContext ctx) {
        LayoutDefinition layout = getClonedLayout(orig);

        layout.setName(getLayoutTag(layout.getName()));

        for (LayoutRowDefinition row : layout.getRows()) {
            for (WidgetReference widgetRef : row.getWidgetReferences()) {
                String widgetName = widgetRef.getName();

                // fetch the widget definition
                WidgetDefinition widgetDef = layout.getWidgetDefinition(widgetName);
                if (widgetDef == null) {
                    widgetDef = getLayoutStore().getWidgetDefinition(JSF_CATEGORY, widgetName);
                    if (widgetDef == null) {
                        log.warn("No widget definition found for " + widgetName + " in layout " + orig.getName());
                        continue;
                    }
                    widgetDef.setGlobal(true);
                }
                widgetDef = getWidgetDefinition(widgetDef, ctx);
                layout.setWidgetDefinition(widgetDef.getName(), widgetDef);
                widgetRef.setName(widgetDef.getName());
            }
        }

        return layout;
    }

    @Override
    public WidgetDefinition getWidgetDefinition(WidgetDefinition orig, LayoutConversionContext ctx) {
        WidgetDefinition clone = getClonedWidget(orig);
        convertWidgetDefinition(clone);
        return clone;
    }

    private static String getLayoutTag(String name) {
        return TAG_PREFIX + "-" +  getTag(name);
    }

    private static String getWidgetTag(String name) {
        return TAG_PREFIX + "-widget-" +  getTag(name);
    }

    private static String getWidgetTypeTag(String name) {
        return TAG_PREFIX + "-widget-type-" +  getTag(name);
    }

    private static String getTag(String name) {
        // handle studio generated ids differently to make them look nicer
        if (name.contains("@")) {
            String[] parts = name.split("@");
            name = parts[1] + "-" + parts[0];
        }
        // remove all but valid charaters
        name = name.replaceAll("[^a-zA-Z0-9-]", "-");
        // camel case to lower hyphen
        name = CaseFormat.UPPER_CAMEL.to(CaseFormat.LOWER_HYPHEN, name);
        // remove any '--' that the previous step might have added
        name = name.replaceAll("--", "-");
        return name;
    }

    private void convertWidgetDefinition(WidgetDefinition widget) {
        widget.setName(getWidgetTag(widget.getName()));
        widget.setType(getWidgetTypeTag(widget.getType()));

        for (WidgetReference subWidget : widget.getSubWidgetReferences()) {
            // TODO
        }
        for (WidgetDefinition subWidget : widget.getSubWidgetDefinitions()) {
            convertWidgetDefinition(subWidget);
        }
    }

    private LayoutStore getLayoutStore() {
        if (layoutStore == null) {
            layoutStore = Framework.getService(LayoutStore.class);
        }
        return layoutStore;
    }

    protected LayoutDefinition getClonedLayout(LayoutDefinition layout) {
        return layout.clone();
    }

    protected WidgetDefinition getClonedWidget(WidgetDefinition widget) {
        return widget.clone();
    }
}

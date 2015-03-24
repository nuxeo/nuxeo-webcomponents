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

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.nuxeo.ecm.platform.forms.layout.api.LayoutDefinition;
import org.nuxeo.ecm.platform.forms.layout.api.LayoutRowDefinition;
import org.nuxeo.ecm.platform.forms.layout.api.WidgetDefinition;
import org.nuxeo.ecm.platform.forms.layout.api.WidgetReference;
import org.nuxeo.ecm.platform.forms.layout.api.converters.AbstractLayoutDefinitionConverter;
import org.nuxeo.ecm.platform.forms.layout.api.converters.LayoutConversionContext;
import org.nuxeo.ecm.platform.forms.layout.api.converters.WidgetDefinitionConverter;
import org.nuxeo.ecm.platform.forms.layout.api.service.LayoutStore;
import org.nuxeo.runtime.api.Framework;

import java.util.List;

import static org.nuxeo.ecm.platform.webcomponents.layout.converters.TagUtils.getTag;

/**
 * Converter to allow reusing existing JSF layout definitions as web components.
 *
 * @since 7.3
 */
public class LayoutToTagConverter extends AbstractLayoutDefinitionConverter {

    protected static final Log log = LogFactory.getLog(LayoutToTagConverter.class);

    // reuse existing 'jsf' widget definitions for now
    private static final String JSF_CATEGORY = "jsf";

    private static final String CONVERSION_CATEGORY = "webcomponents";

    private LayoutStore layoutStore;

    @Override
    public LayoutDefinition getLayoutDefinition(LayoutDefinition orig, LayoutConversionContext ctx) {
        LayoutDefinition layout = getClonedLayout(orig);

        layout.setName(getTag(layout.getName()));

        for (LayoutRowDefinition row : layout.getRows()) {
            for (WidgetReference widgetRef : row.getWidgetReferences()) {
                String widgetName = widgetRef.getName();
                WidgetDefinition widgetDef = layout.getWidgetDefinition(widgetName);
                if (widgetDef == null) {
                    widgetDef = getLayoutStore().getWidgetDefinition(JSF_CATEGORY, widgetName);
                }
                if (widgetDef != null) {
                    widgetDef = convertWidget(widgetDef, ctx);
                    layout.setWidgetDefinition(widgetName, widgetDef);
                } else {
                    log.warn("Failed to find widget definition for " + widgetName);
                }
            }
        }

        return layout;
    }

    protected WidgetDefinition convertWidget(WidgetDefinition widgetDef, LayoutConversionContext ctx) {
        List<WidgetDefinitionConverter> converters = getLayoutStore().getWidgetConverters(CONVERSION_CATEGORY);
        if (converters != null) {
            for (WidgetDefinitionConverter conv : converters) {
                widgetDef = conv.getWidgetDefinition(widgetDef, ctx);
            }
        }
        return widgetDef;
    }

    private LayoutStore getLayoutStore() {
        if (layoutStore == null) {
            layoutStore = Framework.getService(LayoutStore.class);
        }
        return layoutStore;
    }
}

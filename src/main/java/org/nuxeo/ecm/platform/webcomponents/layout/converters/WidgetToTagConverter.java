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

import org.nuxeo.ecm.platform.forms.layout.api.WidgetDefinition;
import org.nuxeo.ecm.platform.forms.layout.api.WidgetReference;
import org.nuxeo.ecm.platform.forms.layout.api.converters.AbstractWidgetDefinitionConverter;
import org.nuxeo.ecm.platform.forms.layout.api.converters.LayoutConversionContext;

import static org.nuxeo.ecm.platform.webcomponents.layout.converters.TagUtils.getTag;

/**
 * Converter to allow reusing existing JSF widget definitions as web components.
 *
 * @since 7.3
 */
public class WidgetToTagConverter extends AbstractWidgetDefinitionConverter {

    @Override
    public WidgetDefinition getWidgetDefinition(WidgetDefinition orig, LayoutConversionContext ctx) {
        WidgetDefinition clone = getClonedWidget(orig);
        convertDefinition(clone);
        return clone;
    }

    private void convertDefinition(WidgetDefinition widget) {
        widget.setName(getTag(widget.getName()));
        widget.setType(getTag(widget.getType()));

        for (WidgetReference subWidget : widget.getSubWidgetReferences()) {
            // TODO
        }
        for (WidgetDefinition subWidget : widget.getSubWidgetDefinitions()) {
            convertDefinition(subWidget);
        }
    }
}

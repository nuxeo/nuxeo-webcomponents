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
 *     Anahide Tchertchian
 */
package org.nuxeo.ecm.platform.webcomponents.layout.converters;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.nuxeo.ecm.platform.forms.layout.api.FieldDefinition;
import org.nuxeo.ecm.platform.forms.layout.api.WidgetDefinition;
import org.nuxeo.ecm.platform.forms.layout.api.converters.LayoutConversionContext;
import org.nuxeo.ecm.platform.forms.layout.api.converters.WidgetDefinitionConverter;
import org.nuxeo.ecm.platform.forms.layout.api.impl.FieldDefinitionImpl;

/**
 * Widget converter handling JSF field definitions matching data['dc']['description'] and data.dc.description.
 *
 * @since 7.3
 */
public class JSFListingWidgetConverter implements WidgetDefinitionConverter {

    // FIXME this is a hacky way of converting most of document_listing_table widget field definitions

    protected static final Pattern DATA_PATTERN_1 = Pattern.compile("^data\\['([^']+)']");

    protected static final Pattern DATA_PATTERN_2 = Pattern.compile("^data\\['([^']+)']\\['([^']+)']");

    protected static final Pattern DATA_PATTERN_3 = Pattern.compile("^data.([^.]+)");

    protected static final Pattern DATA_PATTERN_4 = Pattern.compile("^data.([^.]+).([^.]+)");

    @Override
    public WidgetDefinition getWidgetDefinition(WidgetDefinition orig, LayoutConversionContext ctx) {
        if (orig == null) {
            return orig;
        }
        FieldDefinition[] fields = orig.getFieldDefinitions();
        if (fields == null || fields.length == 0) {
            return orig;
        }
        WidgetDefinition w = orig.clone();
        FieldDefinition[] convertedFields = new FieldDefinition[fields.length];
        for (int i = 0; i < fields.length; i++) {
            FieldDefinition f = fields[i];
            if (f == null) {
                convertedFields[i] = null;
            } else {
                String p = f.getPropertyName();
                if (p != null) {
                    Matcher m1 = DATA_PATTERN_1.matcher(p);
                    Matcher m2 = DATA_PATTERN_2.matcher(p);
                    Matcher m3 = DATA_PATTERN_3.matcher(p);
                    Matcher m4 = DATA_PATTERN_4.matcher(p);
                    if (m1.matches()) {
                        convertedFields[i] = getConvertedField(m1, false);
                    } else if (m2.matches()) {
                        convertedFields[i] = getConvertedField(m2, true);
                    } else if (m3.matches()) {
                        convertedFields[i] = getConvertedField(m3, false);
                    } else if (m4.matches()) {
                        convertedFields[i] = getConvertedField(m4, true);
                    } else {
                        // give up conversion
                        convertedFields[i] = f.clone();
                    }
                } else {
                    convertedFields[i] = f.clone();
                }
            }
        }
        w.setFieldDefinitions(convertedFields);
        return w;
    }

    protected FieldDefinition getConvertedField(Matcher m, boolean twice) {
        if (twice) {
            return new FieldDefinitionImpl(null, String.format("%s:%s", m.group(1), m.group(2)));
        } else {
            return new FieldDefinitionImpl(null, String.format("%s", m.group(1)));
        }
    }

}

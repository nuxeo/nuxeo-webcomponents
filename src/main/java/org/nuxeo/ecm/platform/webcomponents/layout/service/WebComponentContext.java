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
package org.nuxeo.ecm.platform.webcomponents.layout.service;

import org.nuxeo.ecm.platform.forms.layout.api.converters.LayoutConversionContext;

/**
 * Helper class for conversion of layouts during instantiation of layouts/widgets.
 * <p>
 * Might be useful for other contextual information later (for variables resolution for instance).
 *
 * @since 7.3
 */
public class WebComponentContext {

    protected LayoutConversionContext conversionContext;

    protected String originalCategory;

    protected String conversionCategory;

    public WebComponentContext(LayoutConversionContext conversionContext, String originalCategory, String conversionCategory) {
        super();
        this.conversionContext = conversionContext;
        this.originalCategory = originalCategory;
        this.conversionCategory = conversionCategory;
    }

    public LayoutConversionContext getConversionContext() {
        return conversionContext;
    }

    public String getOriginalCategory() {
        return originalCategory;
    }

    public String getConversionCategory() {
        return conversionCategory;
    }

}

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

import java.util.List;

import org.nuxeo.ecm.platform.forms.layout.api.Layout;
import org.nuxeo.ecm.platform.forms.layout.api.LayoutDefinition;
import org.nuxeo.ecm.platform.forms.layout.api.Widget;
import org.nuxeo.ecm.platform.forms.layout.api.WidgetDefinition;

/**
 * Service resolving layout/widget instance from the corresponding definitions.
 * <p>
 * Ultimately this service should be able to resolve some expressions server side, and will be using a specific context
 * for variables resolution.
 *
 * @since 7.3
 */
public interface WebComponentLayoutManager {

    public static final String CATEGORY = "webcomponents";

    Layout getLayout(String layoutName, String mode);

    Layout getLayout(String layoutName, String layoutCategory, String mode, List<String> selectedRows,
            boolean selectAllRowsByDefault);

    Layout getLayout(LayoutDefinition layoutDef, String mode, List<String> selectedRows, boolean selectAllRowsByDefault);

    Widget getWidget(String widgetName, String widgetCategory, String layoutMode, String layoutName);

    Widget getWidget(WidgetDefinition widgetDef, String layoutMode, String layoutName);

}

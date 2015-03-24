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

package org.nuxeo.ecm.platform.webcomponents.layout.facelets;

import org.nuxeo.ecm.platform.forms.layout.api.Widget;
import org.nuxeo.ecm.platform.forms.layout.api.exceptions.WidgetException;
import org.nuxeo.ecm.platform.forms.layout.facelets.LeafFaceletHandler;
import org.nuxeo.ecm.platform.forms.layout.facelets.plugins.AbstractWidgetTypeHandler;

import javax.faces.view.facelets.FaceletContext;
import javax.faces.view.facelets.FaceletHandler;
import javax.faces.view.facelets.TagConfig;

/**
 * Dummy Widget type handler.
 *
 * @since 7.3
 */
public class WebComponentWidgetTypeHandler extends AbstractWidgetTypeHandler {

    @Override
    public FaceletHandler getFaceletHandler(FaceletContext ctx, TagConfig tagConfig, Widget widget,
        FaceletHandler[] subHandlers) throws WidgetException {
        return new LeafFaceletHandler();
    }
}

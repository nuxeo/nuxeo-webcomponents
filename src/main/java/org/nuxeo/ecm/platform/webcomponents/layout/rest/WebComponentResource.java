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
package org.nuxeo.ecm.platform.webcomponents.layout.rest;

import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Response;

import net.sf.json.JSONObject;

import org.nuxeo.ecm.platform.forms.layout.api.Layout;
import org.nuxeo.ecm.platform.forms.layout.api.Widget;
import org.nuxeo.ecm.platform.forms.layout.api.converters.LayoutConversionContext;
import org.nuxeo.ecm.platform.forms.layout.io.JSONLayoutExporter;
import org.nuxeo.ecm.platform.webcomponents.layout.service.WebComponentContext;
import org.nuxeo.ecm.platform.webcomponents.layout.service.WebComponentLayoutManager;
import org.nuxeo.runtime.api.Framework;

/**
 * @since 7.3
 */
@Path("webcomponent")
public class WebComponentResource {

    protected WebComponentContext getConversionContext(String language) {
        LayoutConversionContext lc = new LayoutConversionContext(language, null);
        WebComponentContext ctx = new WebComponentContext(lc, "jsf", "webcomponents_instances");
        return ctx;
    }

    // http://localhost:8080/nuxeo/site/webcomponent/layout/jsf/heading/view?category=jsf&lang=fr&pretty=true
    @GET
    @Path("layout/{name}/{mode}")
    @Produces("application/json")
    public Object getLayout(@PathParam("name") String name, @QueryParam("category") String cat,
            @PathParam("mode") String mode, @QueryParam("lang") String language, @QueryParam("pretty") boolean pretty) {
        WebComponentLayoutManager manager = Framework.getService(WebComponentLayoutManager.class);
        Layout l = manager.getLayout(getConversionContext(language), name, cat, mode, null, false);
        if (l != null) {
            JSONObject json = JSONLayoutExporter.exportToJson(l);
            String res;
            if (pretty) {
                res = json.toString(2);
            } else {
                res = json.toString();
            }
            return res;
        } else {
            return Response.status(401).build();
        }
    }

    // http://localhost:8080/nuxeo/site/webcomponent/widget/title/view?category=jsf&lang=fr&pretty=true
    @GET
    @Path("widget/{name}/{mode}")
    @Produces("application/json")
    public Object getWidget(@PathParam("name") String name, @QueryParam("category") String cat,
            @PathParam("mode") String mode, @QueryParam("lang") String language, @QueryParam("pretty") boolean pretty) {
        WebComponentLayoutManager manager = Framework.getService(WebComponentLayoutManager.class);
        Widget w = manager.getWidget(getConversionContext(language), name, cat, mode, null);
        if (w != null) {
            JSONObject json = JSONLayoutExporter.exportToJson(w);
            String res;
            if (pretty) {
                res = json.toString(2);
            } else {
                res = json.toString();
            }
            return res;
        } else {
            return Response.status(401).build();
        }
    }

}

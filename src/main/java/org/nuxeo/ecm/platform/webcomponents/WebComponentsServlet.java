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

package org.nuxeo.ecm.platform.webcomponents;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.nuxeo.common.utils.FileUtils;
import org.nuxeo.ecm.platform.forms.layout.api.LayoutDefinition;
import org.nuxeo.ecm.platform.forms.layout.api.LayoutRowDefinition;
import org.nuxeo.ecm.platform.forms.layout.api.WidgetDefinition;
import org.nuxeo.ecm.platform.forms.layout.api.WidgetReference;
import org.nuxeo.ecm.platform.forms.layout.api.WidgetTypeDefinition;
import org.nuxeo.ecm.platform.forms.layout.api.converters.LayoutConversionContext;
import org.nuxeo.ecm.platform.forms.layout.api.converters.LayoutDefinitionConverter;
import org.nuxeo.ecm.platform.forms.layout.api.converters.WidgetDefinitionConverter;
import org.nuxeo.ecm.platform.forms.layout.api.service.LayoutStore;
import org.nuxeo.ecm.platform.rendering.api.RenderingException;
import org.nuxeo.ecm.platform.rendering.api.ResourceLocator;
import org.nuxeo.ecm.platform.rendering.api.View;
import org.nuxeo.ecm.platform.rendering.fm.FreemarkerEngine;
import org.nuxeo.ecm.platform.webcomponents.layout.service.WebComponentLayoutManager;
import org.nuxeo.runtime.api.Framework;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.PrintWriter;
import java.net.MalformedURLException;
import java.net.URL;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Servlet to produce web components from layouts and widgets.
 *
 * @since 7.3
 */
public class WebComponentsServlet extends HttpServlet {

    protected static final Log log = LogFactory.getLog(WebComponentsServlet.class);

    private static final FreemarkerEngine engine = new FreemarkerEngine(null, new Locator());

    // reuse existing 'jsf' layout/widget definitions for now
    private static final String JSF_CATEGORY = "jsf";

    // but apply our layout/widget converters
    // and use our own widget types
    private static final String WEBCOMPONENTS_CATEGORY = WebComponentLayoutManager.CATEGORY;

    private static final String DEFAULT_LANGUAGE = "en";

    // router patterns
    private static final Pattern WIDGET_PATTERN = Pattern.compile("/widgets/(.*).html");
    private static final Pattern LAYOUT_PATTERN = Pattern.compile("/layouts/(.*).html");

    // resource paths
    private static final String STATIC_PATH = "/public";
    private static final String TEMPLATE_PATH = "/templates";

    // prefix for our template resources
    private static final String TEMPLATE_PREFIX = "template:/";

    private LayoutStore layoutStore;

    private Map<String, LayoutDefinition> layoutDefinitions;

    private Map<String, WidgetTypeDefinition> widgetTypeDefinitions;

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {

        String path = req.getPathInfo();
        if (path == null) {
            resp.sendError(404);
            return;
        }

        // be sure to remove any ..
        path = path.replaceAll("\\.\\.", "");

        InputStream resource = getResource(STATIC_PATH + path);
        if (resource != null) {
            send(resource, resp);
            return;
        }

        // check if it's a widget
        Matcher widgetMatcher = WIDGET_PATTERN.matcher(path);
        if (widgetMatcher.find()) {
            View view = getWidgetView(widgetMatcher.group(1));
            if (view != null) {
                send(view, resp);
                return;
            }
        }

        // or a layout
        Matcher layoutMatcher = LAYOUT_PATTERN.matcher(path);
        if (layoutMatcher.find()) {
            View view = getLayoutView(layoutMatcher.group(1));
            if (view != null) {
                send(view, resp);
                return;
            }
        }

        // if none, return 404
        resp.sendError(404);
    }

    protected void send(View view, HttpServletResponse resp) throws IOException {
        try {
            view.render(resp.getOutputStream());
        } catch (RenderingException e) {
            log.error("Unable to render " + view.getName(), e);
            send(e, resp);
        }
    }

    protected void send(InputStream in, HttpServletResponse resp) throws IOException {
        OutputStream out = resp.getOutputStream();
        try {
            FileUtils.copy(in, out);
        } finally {
            in.close();
        }
        out.flush();
    }

    protected void send(Exception e, HttpServletResponse resp) throws IOException {
        if (resp.isCommitted()) {
            log.error("Unable to send exception. Response already commited");
            return;
        }
        resp.setStatus(500);
        resp.setContentType("text/plain");
        resp.setCharacterEncoding("UTF-8");
        resp.reset();
        PrintWriter pw = resp.getWriter();
        pw.write(e.getMessage());
        e.printStackTrace(pw);
    }

    protected View getWidgetView(String tag) {
        WidgetTypeDefinition def = getWidgetTypeDefinitions().get(tag);
        if (def == null) {
            return null;
        }
        return getTemplate("widget").arg("tag", tag).arg("widget", def);
    }

    protected View getLayoutView(String tag) {
        LayoutDefinition def = getLayoutDefinitions().get(tag);
        if (def == null) {
            return null;
        }
        Set<String> widgetTypes = new HashSet<>();
        for (LayoutRowDefinition row : def.getRows()) {
            for (WidgetReference widgetRef : row.getWidgetReferences()) {
                WidgetDefinition widgetDef = def.getWidgetDefinition(widgetRef.getName());
                widgetTypes.add(widgetDef.getType());
            }
        }
        return getTemplate("layout")
            .arg("tag", tag)
            .arg("layout", def)
            .arg("widgetTypes", widgetTypes);
    }

    private View getTemplate(String  name) {
        return engine.getView(TEMPLATE_PREFIX + name, this);
    }

    private Map<String, WidgetTypeDefinition> getWidgetTypeDefinitions() {
        if (widgetTypeDefinitions == null) {
            widgetTypeDefinitions = getLayoutStore().getWidgetTypeDefinitions(WEBCOMPONENTS_CATEGORY).stream()
                .collect(Collectors.toMap(WidgetTypeDefinition::getName, Function.identity()));
        }
        return widgetTypeDefinitions;
    }

    private Map<String, LayoutDefinition> getLayoutDefinitions() {
        if (layoutDefinitions == null) {
            layoutDefinitions = new HashMap<>();
            for (String layoutName : getLayoutStore().getLayoutDefinitionNames(JSF_CATEGORY)) {
                LayoutDefinition layoutDef = convertLayout(getLayoutStore().getLayoutDefinition(JSF_CATEGORY, layoutName));
                String tag = layoutDef.getName();
                if (layoutDefinitions.containsKey(tag)) {
                    log.warn("Duplicate layout tag " + tag);
                    continue;
                }
                layoutDefinitions.put(tag, layoutDef);
            }
        }
        return layoutDefinitions;
    }

    private LayoutStore getLayoutStore() {
        if (layoutStore == null) {
            layoutStore = Framework.getService(LayoutStore.class);
        }
        return layoutStore;
    }

    public LayoutDefinition convertLayout(LayoutDefinition layoutDef) {
        List<LayoutDefinitionConverter> converters = getLayoutStore().getLayoutConverters(WEBCOMPONENTS_CATEGORY);
        if (converters != null) {
            LayoutConversionContext ctx = new LayoutConversionContext(DEFAULT_LANGUAGE, null);
            for (LayoutDefinitionConverter conv : converters) {
                layoutDef = conv.getLayoutDefinition(layoutDef, ctx);
            }
        }
        return layoutDef;
    }

    public WidgetDefinition convertWidget(WidgetDefinition widgetDef) {
        List<WidgetDefinitionConverter> converters = getLayoutStore().getWidgetConverters(WEBCOMPONENTS_CATEGORY);
        if (converters != null) {
            LayoutConversionContext ctx = new LayoutConversionContext(DEFAULT_LANGUAGE, null);
            for (WidgetDefinitionConverter conv : converters) {
                widgetDef = conv.getWidgetDefinition(widgetDef, ctx);
            }
        }
        return widgetDef;
    }

    public WidgetDefinition getWidget(String name) {
        return layoutStore.getWidgetDefinition(JSF_CATEGORY, name);
    }

    private WidgetTypeDefinition getWidgetTypeDefinition(String name) {
        return getLayoutStore().getWidgetTypeDefinition(WEBCOMPONENTS_CATEGORY, name);
    }

    protected static InputStream getResource(String path) {
        return WebComponentsServlet.class.getResourceAsStream(path);
    }

    /**
     * Locator used by the freemarker engine
     */
    static class Locator implements ResourceLocator {
        @Override
        public File getResourceFile(String key) {
            return null;
        }

        @Override
        public URL getResourceURL(String key) {
            if (key.startsWith(TEMPLATE_PREFIX)) {
                return getClass().getResource(
                    String.format("%s/%s.ftl", TEMPLATE_PATH, key.substring(TEMPLATE_PREFIX.length())));
            } else {
                try {
                    return new URL(key);
                } catch (MalformedURLException e) {
                    log.error("Malformed resource URL " + key);
                    return null;
                }
            }

        }
    }
}

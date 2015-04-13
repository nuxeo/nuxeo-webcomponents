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

import org.nuxeo.ecm.platform.webcomponents.metadata.ElementMetadata;
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
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

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
    private static final String WEBCOMPONENTS_CATEGORY = "webcomponents";

    private static final String DEFAULT_LANGUAGE = "en";

    // router patterns
    private static final Pattern WIDGET_PATTERN = Pattern.compile("/widgets/(.*).html");
    private static final String WIDGET_METADATA = "/widgets/metadata.html";

    private static final Pattern LAYOUT_PATTERN = Pattern.compile("/layouts/(.*).html");
    private static final String LAYOUT_METADATA = "/layouts/metadata.html";

    private static final String BOWER_PACKAGE = "/package.zip";

    // resource paths
    private static final String STATIC_PATH = "/public";
    private static final String TEMPLATE_PATH = "/templates";

    // prefix for our template resources
    private static final String TEMPLATE_PREFIX = "template:/";

    private LayoutStore layoutStore;

    // Metadata for our custom elements
    private List<ElementMetadata> widgetTypesMetadata = null;
    private List<ElementMetadata> widgetsMetadata = null;
    private List<ElementMetadata> layoutsMetadata = null;

    @Override
    public void init() throws ServletException {
        // TODO: conversions should be handled by listeners
        convertJSFWidgetDefinitions();
        convertJSFLayoutDefinitions();
    }

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {

        String path = req.getPathInfo();
        if (path == null) {
            resp.sendError(404);
            return;
        }

        // be sure to remove any ..
        path = path.replaceAll("\\.\\.", "");

        if (sendStatic(path, resp)) {
            return;
        }

        View view;

        if (BOWER_PACKAGE.equals(path)) {
            sendPackage(resp);
            return;
        }

        if (WIDGET_METADATA.equals(path)) {
            String uri = req.getRequestURI();
            String baseURL = uri.substring(0, uri.length() - WIDGET_METADATA.length());
            // widgets + widget types metadata
            List<ElementMetadata> metadata = new ArrayList<>();
            metadata.addAll(getWidgetTypesMetadata());
            metadata.addAll(getWidgetsMetadata());
            view = getTemplate("metadata")
                .arg("entries", metadata)
                .arg("importPath", baseURL + "/widgets");
            send(view, resp);
            return;
        }

        // layouts metadata
        if (LAYOUT_METADATA.equals(path)) {
            String uri = req.getRequestURI();
            String baseURL = uri.substring(0, uri.length() - WIDGET_METADATA.length());
            view = getTemplate("metadata")
                .arg("entries", getLayoutsMetadata())
                .arg("importPath", baseURL + "/layouts");
            send(view, resp);
            return;
        }

        // check if it's a widget
        Matcher widgetMatcher = WIDGET_PATTERN.matcher(path);
        if (widgetMatcher.find()) {
            String tag = widgetMatcher.group(1);
            view = getWidgetView(tag);
            if (view != null) {
                send(view, resp);
                return;
            }
        }

        // or a layout
        Matcher layoutMatcher = LAYOUT_PATTERN.matcher(path);
        if (layoutMatcher.find()) {
            view = getLayoutView(layoutMatcher.group(1));
            if (view != null) {
                send(view, resp);
                return;
            }
        }

        // if none, return 404
        resp.sendError(404);
    }

    protected void sendPackage(HttpServletResponse resp) throws IOException {
        resp.setContentType("application/zip");
        resp.setHeader("Content-Disposition", "attachment;filename=package.zip");
        ZipOutputStream zos = null;
        try {
            zos = new ZipOutputStream(resp.getOutputStream());
            for (LayoutDefinition layout : getLayouts()) {
                addZipEntry(zos, "layouts/" + layout.getName() + ".html", getLayoutView(layout.getName()));
            }
            for (WidgetDefinition widget : getWidgets()) {
                addZipEntry(zos, "widgets/" + widget.getName() + ".html", getWidgetView(widget.getName()));
            }
        } catch (IOException | RenderingException e) {
            log.error("Failed to produce bower package", e);
            send(e, resp);
        } finally {
            if (zos != null) {
                zos.close();
            }
        }
    }

    private void addZipEntry(ZipOutputStream zos, String name, View view) throws IOException, RenderingException {
        ZipEntry entry = new ZipEntry(name);
        zos.putNextEntry(entry);
        view.render(zos);
        zos.flush();
        zos.closeEntry();
    }

    protected void send(View view, HttpServletResponse resp) throws IOException {
        try {
            view.render(resp.getOutputStream());
        } catch (RenderingException e) {
            log.error("Unable to render " + view.getName(), e);
            send(e, resp);
        }
    }

    protected boolean sendStatic(String path, HttpServletResponse resp) throws IOException {
        InputStream is = getResource(STATIC_PATH + path);
        if (is == null) {
            return false;
        }
        send(is, resp);
        return true;
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
        WidgetDefinition def = getWidgetDefinition(tag);
        if (def == null) {
            return null;
        }
        return getTemplate("widget").arg("tag", tag).arg("widget", def);
    }

    protected View getLayoutView(String tag) {
        LayoutDefinition def = getLayoutDefinition(tag);
        if (def == null) {
            return null;
        }
        // get a list of widget ready for import
        Set<WidgetDefinition> widgets = new HashSet<>();
        for (LayoutRowDefinition row : def.getRows()) {
            for (WidgetReference widgetRef : row.getWidgetReferences()) {
                WidgetDefinition widgetDef = def.getWidgetDefinition(widgetRef.getName());
                widgets.add(widgetDef);
            }
        }
        return getTemplate("layout")
            .arg("tag", tag)
            .arg("layout", def)
            .arg("widgets", widgets); // widget definition names
    }

    private View getTemplate(String  name) {
        return engine.getView(TEMPLATE_PREFIX + name, this);
    }

    private void convertJSFWidgetDefinitions() {
        for (String widgetName : getLayoutStore().getWidgetDefinitionNames(JSF_CATEGORY)) {
            WidgetDefinition widgetDef = convertWidget(getLayoutStore().getWidgetDefinition(JSF_CATEGORY, widgetName));
            getLayoutStore().registerWidget(WEBCOMPONENTS_CATEGORY, widgetDef);
        }
    }

    private void convertJSFLayoutDefinitions() {
        for (String layoutName : getLayoutStore().getLayoutDefinitionNames(JSF_CATEGORY)) {
            LayoutDefinition layoutDef = convertLayout(getLayoutStore().getLayoutDefinition(JSF_CATEGORY, layoutName));
            getLayoutStore().registerLayout(WEBCOMPONENTS_CATEGORY, layoutDef);
        }
    }

    private List<WidgetTypeDefinition> getWidgetTypes() {
        return getLayoutStore().getWidgetTypeDefinitions(WEBCOMPONENTS_CATEGORY);
    }

    private List<ElementMetadata> getWidgetTypesMetadata() {
        if (widgetTypesMetadata == null) {
            widgetTypesMetadata = getWidgetTypes().stream()
                .map(ElementMetadata::from)
                .collect(Collectors.toList());
        }
        return widgetTypesMetadata;
    }

    private List <WidgetDefinition> getWidgets() {
        return getLayoutStore().getWidgetDefinitionNames(WEBCOMPONENTS_CATEGORY).stream()
            .map((widgetName) -> getLayoutStore().getWidgetDefinition(WEBCOMPONENTS_CATEGORY, widgetName))
            .collect(Collectors.toList());
    }

    private List<ElementMetadata> getWidgetsMetadata() {
        if (widgetsMetadata == null) {
            widgetsMetadata = getWidgets().stream()
                .map(ElementMetadata::from)
                .filter((meta) -> meta != null) // widgets without a matching "webcomponents" widget type return null
                .collect(Collectors.toList());
        }
        return widgetsMetadata;
    }

    private List<LayoutDefinition> getLayouts() {
        return getLayoutStore().getLayoutDefinitionNames(WEBCOMPONENTS_CATEGORY).stream()
            .map((layoutName) -> getLayoutStore().getLayoutDefinition(WEBCOMPONENTS_CATEGORY, layoutName))
            .collect(Collectors.toList());
    }

    private List<ElementMetadata> getLayoutsMetadata() {
        if (layoutsMetadata == null) {
            layoutsMetadata = getLayouts().stream()
                .filter((def) -> def != null)
                .map(ElementMetadata::from)
                .collect(Collectors.toList());
        }
        return layoutsMetadata;
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

    public WidgetDefinition getWidgetDefinition(String name) {
        return getLayoutStore().getWidgetDefinition(WEBCOMPONENTS_CATEGORY, name);
    }

    public WidgetTypeDefinition getWidgetTypeDefinition(String name) {
        return getLayoutStore().getWidgetTypeDefinition(WEBCOMPONENTS_CATEGORY, name);
    }

    public LayoutDefinition getLayoutDefinition(String name) {
        return getLayoutStore().getLayoutDefinition(WEBCOMPONENTS_CATEGORY, name);
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
            try {
                if (key.startsWith(TEMPLATE_PREFIX)) {
                    String path = String.format("%s/%s.ftl", TEMPLATE_PATH, key.substring(TEMPLATE_PREFIX.length()));
                    return getClass().getResource(path);
                } else {
                    return new URL(key);
                }
            } catch (MalformedURLException e) {
                log.error("Malformed resource URL " + key);
                return null;
            }

        }
    }
}
